import { Router, Request, Response } from 'express';
import { LaunchRequest, VMConfig, LaunchStep, StepProgress } from '../types';
import * as vmStore from '../services/vmStore';
import * as awsService from '../services/aws';
import * as templateService from '../services/templates';
import { provisionVM } from '../services/provisioner';
import wsManager from '../websocket';
import { config } from '../config';
import logger from '../middleware/logger';

const router = Router();

// Security group name (reused across launches)
const SG_NAME = 'cloudlaunch-default-sg';

async function executeLaunchFlow(vmId: string): Promise<void> {
  const vm = vmStore.getVM(vmId);
  if (!vm) {
    logger.error(`Launch flow: VM ${vmId} not found`);
    return;
  }

  try {
    // Step 1: Create key pair
    logger.info(`[${vmId}] Creating key pair: ${vm.keyPairName}`);
    wsManager.sendVMUpdate(vmId, { phase: 'creating_keypair' });

    const privateKey = await awsService.createKeyPair(vm.keyPairName);
    vmStore.setVMAwsDetails(vmId, { privateKey });

    // Step 2: Create/reuse security group
    logger.info(`[${vmId}] Creating/reusing security group: ${SG_NAME}`);
    wsManager.sendVMUpdate(vmId, { phase: 'creating_security_group' });

    const securityGroupId = await awsService.createSecurityGroup(SG_NAME, undefined, vm.config.region);
    vmStore.setVMAwsDetails(vmId, { securityGroupId });

    // Step 3: Resolve AMI for the target region
    logger.info(`[${vmId}] Resolving Ubuntu AMI for region ${vm.config.region}`);
    wsManager.sendVMUpdate(vmId, { phase: 'resolving_ami' });
    const resolvedAmi = await awsService.resolveUbuntuAMI(vm.config.region);
    vm.config.ami = resolvedAmi;
    vmStore.updateVM(vmId, { config: vm.config });
    logger.info(`[${vmId}] Using AMI ${resolvedAmi}`);

    // Step 4: Launch EC2 instance
    logger.info(`[${vmId}] Launching EC2 instance`);
    wsManager.sendVMUpdate(vmId, { phase: 'launching_instance' });

    const awsInstanceId = await awsService.launchInstance(
      vm.config,
      vm.keyPairName,
      securityGroupId,
      vmId
    );
    vmStore.setVMAwsDetails(vmId, { awsInstanceId });
    wsManager.sendVMUpdate(vmId, { awsInstanceId });

    // Step 4: Wait for instance to be ready
    logger.info(`[${vmId}] Waiting for instance ${awsInstanceId} to be ready`);
    wsManager.sendVMUpdate(vmId, { phase: 'waiting_for_instance' });

    const instanceInfo = await awsService.waitForInstanceReady(
      awsInstanceId,
      300000,
      vm.config.region
    );

    vmStore.setVMAwsDetails(vmId, {
      publicIp: instanceInfo.publicIp,
      privateIp: instanceInfo.privateIp,
    });

    wsManager.sendVMUpdate(vmId, {
      publicIp: instanceInfo.publicIp,
      privateIp: instanceInfo.privateIp,
    });

    // Step 5: Run provisioning steps via SSH (if any)
    const updatedVM = vmStore.getVM(vmId);
    if (!updatedVM) {
      throw new Error(`VM ${vmId} disappeared during launch`);
    }

    if (updatedVM.steps.length > 0) {
      vmStore.updateVMStatus(vmId, 'provisioning');
      wsManager.sendVMUpdate(vmId, { status: 'provisioning' });

      logger.info(`[${vmId}] Starting provisioning (${updatedVM.steps.length} steps)`);

      const onProgress = (
        progressVmId: string,
        stepProgress: StepProgress,
        output?: string
      ): void => {
        vmStore.updateVMStepProgress(progressVmId, stepProgress);
        wsManager.sendStepProgress(progressVmId, stepProgress);
        if (output) {
          wsManager.sendStepOutput(progressVmId, stepProgress.stepId, output);
        }
      };

      await provisionVM(updatedVM, onProgress);
    }

    // Step 6: Mark as running
    vmStore.updateVMStatus(vmId, 'running');
    const finalVM = vmStore.getVM(vmId);
    wsManager.sendVMReady(vmId, {
      status: 'running',
      publicIp: finalVM?.publicIp,
      privateIp: finalVM?.privateIp,
    });

    logger.info(`[${vmId}] VM is ready! Public IP: ${finalVM?.publicIp}`);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`[${vmId}] Launch flow failed: ${error.message}`);
    vmStore.updateVMStatus(vmId, 'failed', error.message);
    wsManager.sendVMError(vmId, error.message);
  }
}

// POST /api/launch
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body as LaunchRequest;

    if (!body.name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    // Resolve config from template + overrides
    let finalConfig: VMConfig = {
      instanceType: config.defaults.instanceType,
      region: config.aws.region,
      ami: config.defaults.ami,
      diskSizeGb: config.defaults.diskSizeGb,
      tags: {},
    };

    let steps: LaunchStep[] = [];

    if (body.templateId) {
      const template = templateService.getTemplateById(body.templateId);
      if (!template) {
        res.status(404).json({ error: `Template not found: ${body.templateId}` });
        return;
      }
      finalConfig = { ...template.defaultConfig };
      steps = [...template.steps];
    }

    // Apply config overrides
    if (body.config) {
      if (body.config.instanceType) finalConfig.instanceType = body.config.instanceType;
      if (body.config.region) finalConfig.region = body.config.region;
      if (body.config.ami) finalConfig.ami = body.config.ami;
      if (body.config.diskSizeGb) finalConfig.diskSizeGb = body.config.diskSizeGb;
      if (body.config.tags) finalConfig.tags = { ...finalConfig.tags, ...body.config.tags };
    }

    // Apply step overrides
    if (body.steps) {
      steps = body.steps;
    }

    // Append custom steps
    if (body.customSteps && body.customSteps.length > 0) {
      const maxOrder = steps.reduce((max, s) => Math.max(max, s.order), 0);
      const customWithOrder = body.customSteps.map((s, i) => ({
        ...s,
        order: s.order || maxOrder + i + 1,
      }));
      steps = [...steps, ...customWithOrder];
    }

    // Add VM name tag
    finalConfig.tags = { ...finalConfig.tags, Name: `cloudlaunch-${body.name}` };

    const vm = vmStore.createVM(body.name, finalConfig, steps, body.templateId);

    // Fire and forget the launch flow
    executeLaunchFlow(vm.id).catch((err: Error) => {
      logger.error(`Unhandled error in launch flow for ${vm.id}: ${err.message}`);
    });

    res.status(202).json({
      message: 'VM launch initiated',
      vm: {
        id: vm.id,
        name: vm.name,
        status: vm.status,
        config: vm.config,
        steps: vm.steps.length,
        createdAt: vm.createdAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to launch VM: ${error.message}`);
    res.status(500).json({ error: 'Failed to launch VM' });
  }
});

export default router;

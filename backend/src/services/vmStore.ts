import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VM, VMConfig, VMStatus, StepProgress, LaunchStep } from '../types';
import { config } from '../config';
import logger from '../middleware/logger';

const VMS_FILE = path.resolve(config.dataDir, 'vms.json');

let vms: VM[] = [];

function ensureDataDir(): void {
  const dir = path.dirname(VMS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadVMs(): void {
  ensureDataDir();
  if (fs.existsSync(VMS_FILE)) {
    try {
      const raw = fs.readFileSync(VMS_FILE, 'utf-8');
      vms = JSON.parse(raw);
      logger.info(`Loaded ${vms.length} VMs from disk`);
    } catch (err: unknown) {
      const error = err as Error;
      logger.warn(`Failed to load VMs file: ${error.message}`);
      vms = [];
    }
  }
}

function saveVMs(): void {
  ensureDataDir();
  try {
    // Omit private keys from persistence for security (they're large)
    // Actually, we need them for reconnection, so persist them
    fs.writeFileSync(VMS_FILE, JSON.stringify(vms, null, 2));
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to save VMs: ${error.message}`);
  }
}

// Initialize on module load
loadVMs();

export function createVM(
  name: string,
  vmConfig: VMConfig,
  steps: LaunchStep[],
  templateId?: string
): VM {
  const vm: VM = {
    id: uuidv4(),
    name,
    templateId,
    config: vmConfig,
    steps,
    keyPairName: `cloudlaunch-${name.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`,
    privateKey: '',
    status: 'launching',
    stepProgress: steps.map((s) => ({
      stepId: s.id,
      status: 'pending' as const,
      output: '',
    })),
    createdAt: new Date().toISOString(),
  };

  vms.push(vm);
  saveVMs();
  logger.info(`VM created: ${vm.id} (${vm.name})`);
  return vm;
}

export function getVM(id: string): VM | undefined {
  return vms.find((v) => v.id === id);
}

export function getAllVMs(): VM[] {
  return vms.map((vm) => ({
    ...vm,
    // Redact private key in list responses
    privateKey: vm.privateKey ? '[REDACTED]' : '',
  }));
}

export function updateVM(id: string, updates: Partial<VM>): VM | null {
  const index = vms.findIndex((v) => v.id === id);
  if (index === -1) return null;

  vms[index] = { ...vms[index], ...updates, id: vms[index].id };
  saveVMs();
  return vms[index];
}

export function updateVMStatus(id: string, status: VMStatus, error?: string): VM | null {
  const vm = vms.find((v) => v.id === id);
  if (!vm) return null;

  vm.status = status;
  if (error) vm.error = error;
  if (status === 'terminated') vm.terminatedAt = new Date().toISOString();

  saveVMs();
  logger.info(`VM ${id} status updated to ${status}`);
  return vm;
}

export function updateVMStepProgress(
  id: string,
  stepProgress: StepProgress
): VM | null {
  const vm = vms.find((v) => v.id === id);
  if (!vm) return null;

  const stepIndex = vm.stepProgress.findIndex(
    (sp) => sp.stepId === stepProgress.stepId
  );
  if (stepIndex !== -1) {
    vm.stepProgress[stepIndex] = stepProgress;
  } else {
    vm.stepProgress.push(stepProgress);
  }

  saveVMs();
  return vm;
}

export function setVMAwsDetails(
  id: string,
  details: {
    awsInstanceId?: string;
    publicIp?: string;
    privateIp?: string;
    privateKey?: string;
    securityGroupId?: string;
  }
): VM | null {
  const vm = vms.find((v) => v.id === id);
  if (!vm) return null;

  if (details.awsInstanceId !== undefined) vm.awsInstanceId = details.awsInstanceId;
  if (details.publicIp !== undefined) vm.publicIp = details.publicIp;
  if (details.privateIp !== undefined) vm.privateIp = details.privateIp;
  if (details.privateKey !== undefined) vm.privateKey = details.privateKey;
  if (details.securityGroupId !== undefined) vm.securityGroupId = details.securityGroupId;

  saveVMs();
  return vm;
}

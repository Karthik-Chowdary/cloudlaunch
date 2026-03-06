import { Client, ConnectConfig } from 'ssh2';
import { VM, StepProgress, LaunchStep } from '../types';
import { config } from '../config';
import logger from '../middleware/logger';

export interface ProgressCallback {
  (vmId: string, stepProgress: StepProgress, output?: string): void;
}

async function connectSSH(vm: VM): Promise<Client> {
  const maxRetries = config.ssh.connectRetries;
  let delay = config.ssh.initialRetryDelayMs;
  const maxDelay = config.ssh.maxRetryDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await new Promise<Client>((resolve, reject) => {
        const conn = new Client();
        const connectConfig: ConnectConfig = {
          host: vm.publicIp!,
          port: 22,
          username: config.ssh.username,
          privateKey: vm.privateKey,
          readyTimeout: 30000,
          keepaliveInterval: 10000,
        };

        conn.on('ready', () => {
          resolve(conn);
        });

        conn.on('error', (err: Error) => {
          reject(err);
        });

        conn.connect(connectConfig);
      });

      logger.info(`SSH connected to ${vm.publicIp} on attempt ${attempt}`);
      return client;
    } catch (err: unknown) {
      const error = err as Error;
      logger.warn(
        `SSH connection attempt ${attempt}/${maxRetries} to ${vm.publicIp} failed: ${error.message}`
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to establish SSH connection to ${vm.publicIp} after ${maxRetries} attempts: ${error.message}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }

  throw new Error('SSH connection failed: exhausted retries');
}

function executeStep(
  client: Client,
  step: LaunchStep,
  vmId: string,
  onProgress: ProgressCallback
): Promise<StepProgress> {
  return new Promise((resolve) => {
    const progress: StepProgress = {
      stepId: step.id,
      status: 'running',
      output: '',
      startedAt: new Date().toISOString(),
    };

    onProgress(vmId, { ...progress });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      progress.status = 'failed';
      progress.error = `Step timed out after ${step.timeout}s`;
      progress.completedAt = new Date().toISOString();
      onProgress(vmId, { ...progress });
      resolve(progress);
    }, step.timeout * 1000);

    const wrappedScript = `set -e\n${step.script}`;

    client.exec(wrappedScript, { pty: true }, (err, stream) => {
      if (err) {
        clearTimeout(timer);
        if (timedOut) return;
        progress.status = 'failed';
        progress.error = `Failed to execute step: ${err.message}`;
        progress.completedAt = new Date().toISOString();
        onProgress(vmId, { ...progress });
        resolve(progress);
        return;
      }

      stream.on('data', (data: Buffer) => {
        if (timedOut) return;
        const line = data.toString();
        progress.output += line;
        onProgress(vmId, { ...progress }, line);
      });

      stream.stderr.on('data', (data: Buffer) => {
        if (timedOut) return;
        const line = data.toString();
        progress.output += line;
        onProgress(vmId, { ...progress }, line);
      });

      stream.on('close', (code: number) => {
        clearTimeout(timer);
        if (timedOut) return;

        progress.completedAt = new Date().toISOString();

        if (code === 0) {
          progress.status = 'completed';
        } else {
          progress.status = 'failed';
          progress.error = `Step exited with code ${code}`;
        }

        onProgress(vmId, { ...progress });
        resolve(progress);
      });
    });
  });
}

export async function provisionVM(
  vm: VM,
  onProgress: ProgressCallback
): Promise<StepProgress[]> {
  logger.info(`Starting provisioning for VM ${vm.id} (${vm.publicIp})`);

  const sortedSteps = [...vm.steps].sort((a, b) => a.order - b.order);
  const results: StepProgress[] = [];
  let client: Client | null = null;

  try {
    client = await connectSSH(vm);

    for (const step of sortedSteps) {
      logger.info(
        `Running step ${step.order}: ${step.name} on VM ${vm.id}`
      );

      const result = await executeStep(client, step, vm.id, onProgress);
      results.push(result);

      if (result.status === 'failed' && !step.continueOnError) {
        logger.error(
          `Step "${step.name}" failed on VM ${vm.id}. Halting provisioning.`
        );
        // Mark remaining steps as skipped
        for (const remaining of sortedSteps) {
          if (!results.find((r) => r.stepId === remaining.id)) {
            const skipped: StepProgress = {
              stepId: remaining.id,
              status: 'skipped',
              output: '',
              completedAt: new Date().toISOString(),
            };
            results.push(skipped);
            onProgress(vm.id, skipped);
          }
        }
        break;
      }

      if (result.status === 'failed' && step.continueOnError) {
        logger.warn(
          `Step "${step.name}" failed on VM ${vm.id} but continueOnError is set. Continuing.`
        );
      }
    }
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Provisioning error for VM ${vm.id}: ${error.message}`);

    // Mark all unfinished steps as failed
    for (const step of sortedSteps) {
      if (!results.find((r) => r.stepId === step.id)) {
        const failed: StepProgress = {
          stepId: step.id,
          status: 'failed',
          output: '',
          error: `Provisioning aborted: ${error.message}`,
          completedAt: new Date().toISOString(),
        };
        results.push(failed);
        onProgress(vm.id, failed);
      }
    }

    throw error;
  } finally {
    if (client) {
      client.end();
      logger.info(`SSH connection closed for VM ${vm.id}`);
    }
  }

  return results;
}

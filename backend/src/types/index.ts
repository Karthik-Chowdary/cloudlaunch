export interface LaunchStep {
  id: string;
  name: string;
  description: string;
  script: string;
  timeout: number;
  continueOnError: boolean;
  order: number;
}

export interface LaunchableTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  tags: string[];
  steps: LaunchStep[];
  defaultConfig: VMConfig;
  createdAt: string;
  updatedAt: string;
}

export interface VMConfig {
  instanceType: string;
  region: string;
  ami: string;
  diskSizeGb: number;
  tags: Record<string, string>;
}

export interface VM {
  id: string;
  name: string;
  templateId?: string;
  config: VMConfig;
  steps: LaunchStep[];
  awsInstanceId?: string;
  publicIp?: string;
  privateIp?: string;
  keyPairName: string;
  privateKey: string;
  securityGroupId?: string;
  status: VMStatus;
  stepProgress: StepProgress[];
  createdAt: string;
  terminatedAt?: string;
  error?: string;
}

export type VMStatus = 'launching' | 'provisioning' | 'running' | 'failed' | 'terminating' | 'terminated';

export interface StepProgress {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface LaunchRequest {
  name: string;
  templateId?: string;
  config: Partial<VMConfig>;
  steps?: LaunchStep[];
  customSteps?: LaunchStep[];
}

export interface WSMessage {
  type: 'vm_update' | 'step_progress' | 'step_output' | 'vm_ready' | 'vm_error' | 'connection_ack';
  payload: unknown;
  vmId?: string;
  timestamp: string;
}

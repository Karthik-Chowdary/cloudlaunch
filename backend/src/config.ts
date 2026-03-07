import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  defaults: {
    ami: process.env.DEFAULT_AMI || 'ami-04680790a315cd58d', // Ubuntu 22.04 LTS us-east-1 (2026-02)
    instanceType: process.env.DEFAULT_INSTANCE_TYPE || 't3.micro',
    diskSizeGb: parseInt(process.env.DEFAULT_DISK_SIZE_GB || '30', 10),
  },
  ssh: {
    connectRetries: parseInt(process.env.SSH_CONNECT_RETRIES || '20', 10),
    initialRetryDelayMs: parseInt(process.env.SSH_INITIAL_RETRY_DELAY_MS || '5000', 10),
    maxRetryDelayMs: parseInt(process.env.SSH_MAX_RETRY_DELAY_MS || '30000', 10),
    username: process.env.SSH_USERNAME || 'ubuntu',
  },
  dataDir: process.env.DATA_DIR || './data',
  teleport: {
    authServer: process.env.TELEPORT_AUTH_SERVER || '',
    cluster: process.env.TELEPORT_CLUSTER || 'teleport.localhost',
    proxyUrl: process.env.TELEPORT_PROXY_URL || 'https://teleport.localhost',
    tctlPath: process.env.TCTL_PATH || '/usr/local/bin/tctl',
    sshUser: process.env.TELEPORT_SSH_USER || 'ubuntu',
    agentVersion: process.env.TELEPORT_AGENT_VERSION || '17',
    enabled: process.env.TELEPORT_ENABLED !== 'false',
  },
};

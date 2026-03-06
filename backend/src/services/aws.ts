import {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
  TerminateInstancesCommand,
  CreateKeyPairCommand,
  DeleteKeyPairCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
  DescribeRegionsCommand,
  DescribeInstanceTypesCommand,
  DescribeImagesCommand,
  type Filter,
  type _InstanceType as EC2InstanceType,
} from '@aws-sdk/client-ec2';
import { config } from '../config';
import { VMConfig } from '../types';
import logger from '../middleware/logger';

function getEC2Client(region?: string): EC2Client {
  return new EC2Client({
    region: region || config.aws.region,
    credentials:
      config.aws.accessKeyId && config.aws.secretAccessKey
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined,
  });
}

export async function createKeyPair(name: string): Promise<string> {
  const ec2 = getEC2Client();
  logger.info(`Creating key pair: ${name}`);

  try {
    const result = await ec2.send(
      new CreateKeyPairCommand({
        KeyName: name,
        KeyType: 'rsa',
        KeyFormat: 'pem',
      })
    );

    const privateKey = result.KeyMaterial;
    if (!privateKey) {
      throw new Error('No private key material returned from AWS');
    }

    logger.info(`Key pair created: ${name}`);
    return privateKey;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to create key pair: ${error.message}`);
    throw error;
  }
}

export async function deleteKeyPair(name: string): Promise<void> {
  const ec2 = getEC2Client();
  logger.info(`Deleting key pair: ${name}`);

  try {
    await ec2.send(new DeleteKeyPairCommand({ KeyName: name }));
    logger.info(`Key pair deleted: ${name}`);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to delete key pair: ${error.message}`);
    throw error;
  }
}

export async function createSecurityGroup(
  name: string,
  vpcId?: string
): Promise<string> {
  const ec2 = getEC2Client();
  logger.info(`Creating security group: ${name}`);

  try {
    // Check if SG already exists
    const existing = await ec2.send(
      new DescribeSecurityGroupsCommand({
        Filters: [{ Name: 'group-name', Values: [name] }],
      })
    );

    if (existing.SecurityGroups && existing.SecurityGroups.length > 0) {
      const existingId = existing.SecurityGroups[0].GroupId;
      if (!existingId) {
        throw new Error('Existing security group has no ID');
      }
      logger.info(`Security group already exists: ${existingId}`);
      return existingId;
    }

    const createParams: {
      GroupName: string;
      Description: string;
      VpcId?: string;
    } = {
      GroupName: name,
      Description: `CloudLaunch security group - ${name}`,
    };
    if (vpcId) {
      createParams.VpcId = vpcId;
    }

    const result = await ec2.send(new CreateSecurityGroupCommand(createParams));
    const groupId = result.GroupId;
    if (!groupId) {
      throw new Error('No security group ID returned');
    }

    // Add inbound rules: SSH(22), HTTP(80), HTTPS(443), dev ports(3000-9999)
    const ingressRules = [
      { FromPort: 22, ToPort: 22, IpProtocol: 'tcp', Description: 'SSH' },
      { FromPort: 80, ToPort: 80, IpProtocol: 'tcp', Description: 'HTTP' },
      { FromPort: 443, ToPort: 443, IpProtocol: 'tcp', Description: 'HTTPS' },
      {
        FromPort: 3000,
        ToPort: 9999,
        IpProtocol: 'tcp',
        Description: 'Dev ports',
      },
    ];

    for (const rule of ingressRules) {
      await ec2.send(
        new AuthorizeSecurityGroupIngressCommand({
          GroupId: groupId,
          IpPermissions: [
            {
              FromPort: rule.FromPort,
              ToPort: rule.ToPort,
              IpProtocol: rule.IpProtocol,
              IpRanges: [
                { CidrIp: '0.0.0.0/0', Description: rule.Description },
              ],
            },
          ],
        })
      );
    }

    logger.info(`Security group created with rules: ${groupId}`);
    return groupId;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to create security group: ${error.message}`);
    throw error;
  }
}

export async function launchInstance(
  vmConfig: VMConfig,
  keyPairName: string,
  securityGroupId: string,
  vmId: string
): Promise<string> {
  const ec2 = getEC2Client(vmConfig.region);
  logger.info(`Launching EC2 instance for VM ${vmId}`);

  try {
    const tags = [
      { Key: 'cloudlaunch:managed', Value: 'true' },
      { Key: 'cloudlaunch:vm-id', Value: vmId },
      ...Object.entries(vmConfig.tags).map(([Key, Value]) => ({ Key, Value })),
    ];

    const result = await ec2.send(
      new RunInstancesCommand({
        ImageId: vmConfig.ami,
        InstanceType: vmConfig.instanceType as EC2InstanceType,
        MinCount: 1,
        MaxCount: 1,
        KeyName: keyPairName,
        SecurityGroupIds: [securityGroupId],
        BlockDeviceMappings: [
          {
            DeviceName: '/dev/sda1',
            Ebs: {
              VolumeSize: vmConfig.diskSizeGb,
              VolumeType: 'gp3',
              DeleteOnTermination: true,
            },
          },
        ],
        TagSpecifications: [
          {
            ResourceType: 'instance',
            Tags: tags,
          },
        ],
      })
    );

    const instanceId = result.Instances?.[0]?.InstanceId;
    if (!instanceId) {
      throw new Error('No instance ID returned from RunInstances');
    }

    logger.info(`Instance launched: ${instanceId}`);
    return instanceId;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to launch instance: ${error.message}`);
    throw error;
  }
}

export interface InstanceInfo {
  instanceId: string;
  state: string;
  publicIp?: string;
  privateIp?: string;
}

export async function describeInstance(
  instanceId: string,
  region?: string
): Promise<InstanceInfo> {
  const ec2 = getEC2Client(region);

  try {
    const result = await ec2.send(
      new DescribeInstancesCommand({
        InstanceIds: [instanceId],
      })
    );

    const instance = result.Reservations?.[0]?.Instances?.[0];
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    return {
      instanceId: instance.InstanceId || instanceId,
      state: instance.State?.Name || 'unknown',
      publicIp: instance.PublicIpAddress || undefined,
      privateIp: instance.PrivateIpAddress || undefined,
    };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to describe instance ${instanceId}: ${error.message}`);
    throw error;
  }
}

export async function waitForInstanceReady(
  instanceId: string,
  timeoutMs: number = 300000,
  region?: string
): Promise<InstanceInfo> {
  const startTime = Date.now();
  const pollIntervalMs = 5000;

  logger.info(
    `Waiting for instance ${instanceId} to be ready (timeout: ${timeoutMs}ms)`
  );

  while (Date.now() - startTime < timeoutMs) {
    const info = await describeInstance(instanceId, region);

    if (info.state === 'running' && info.publicIp) {
      logger.info(
        `Instance ${instanceId} is ready. Public IP: ${info.publicIp}`
      );
      return info;
    }

    if (info.state === 'terminated' || info.state === 'shutting-down') {
      throw new Error(
        `Instance ${instanceId} entered terminal state: ${info.state}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timed out waiting for instance ${instanceId} to be ready after ${timeoutMs}ms`
  );
}

export async function terminateInstance(
  instanceId: string,
  region?: string
): Promise<void> {
  const ec2 = getEC2Client(region);
  logger.info(`Terminating instance: ${instanceId}`);

  try {
    await ec2.send(
      new TerminateInstancesCommand({
        InstanceIds: [instanceId],
      })
    );
    logger.info(`Instance terminated: ${instanceId}`);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to terminate instance ${instanceId}: ${error.message}`);
    throw error;
  }
}

export async function listInstances(
  filters?: Filter[]
): Promise<InstanceInfo[]> {
  const ec2 = getEC2Client();

  const defaultFilters: Filter[] = [
    { Name: 'tag:cloudlaunch:managed', Values: ['true'] },
  ];

  const allFilters = [...defaultFilters, ...(filters || [])];

  try {
    const result = await ec2.send(
      new DescribeInstancesCommand({ Filters: allFilters })
    );

    const instances: InstanceInfo[] = [];
    for (const reservation of result.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        instances.push({
          instanceId: instance.InstanceId || '',
          state: instance.State?.Name || 'unknown',
          publicIp: instance.PublicIpAddress || undefined,
          privateIp: instance.PrivateIpAddress || undefined,
        });
      }
    }

    return instances;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list instances: ${error.message}`);
    throw error;
  }
}

export async function listRegions(): Promise<
  { name: string; endpoint: string }[]
> {
  const ec2 = getEC2Client();

  try {
    const result = await ec2.send(new DescribeRegionsCommand({}));
    return (result.Regions || []).map((r) => ({
      name: r.RegionName || '',
      endpoint: r.Endpoint || '',
    }));
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list regions: ${error.message}`);
    throw error;
  }
}

export async function listInstanceTypes(): Promise<
  { name: string; vcpus: number; memoryMb: number }[]
> {
  const ec2 = getEC2Client();

  try {
    const result = await ec2.send(
      new DescribeInstanceTypesCommand({
        Filters: [
          {
            Name: 'current-generation',
            Values: ['true'],
          },
        ],
        MaxResults: 100,
      })
    );

    return (result.InstanceTypes || [])
      .map((t) => ({
        name: (t.InstanceType as string) || '',
        vcpus: t.VCpuInfo?.DefaultVCpus || 0,
        memoryMb: t.MemoryInfo?.SizeInMiB || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list instance types: ${error.message}`);
    throw error;
  }
}

export async function listAMIs(
  region?: string
): Promise<{ id: string; name: string; description: string }[]> {
  const ec2 = getEC2Client(region);

  try {
    const result = await ec2.send(
      new DescribeImagesCommand({
        Filters: [
          { Name: 'architecture', Values: ['x86_64'] },
          { Name: 'owner-alias', Values: ['amazon'] },
          { Name: 'name', Values: ['ubuntu/images/hvm-ssd/ubuntu-*-22.04*'] },
          { Name: 'state', Values: ['available'] },
        ],
        MaxResults: 50,
      })
    );

    return (result.Images || [])
      .map((img) => ({
        id: img.ImageId || '',
        name: img.Name || '',
        description: img.Description || '',
      }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to list AMIs: ${error.message}`);
    throw error;
  }
}

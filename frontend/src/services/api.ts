import type { VM, LaunchableTemplate, LaunchRequest } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// VMs
export const fetchVMs = () => request<{ vms: VM[] }>('/vms').then(r => r.vms);
export const fetchVM = (id: string) => request<{ vm: VM }>(`/vms/${id}`).then(r => r.vm);
export const terminateVM = (id: string) => request<{ message: string }>(`/vms/${id}`, { method: 'DELETE' });
export const getConnectionInfo = (id: string) =>
  request<{ connection: { sshCommand: string; cursorUri: string; privateKey: string; sshConfig: string; host: string; user: string } }>(`/vms/${id}/connect`, { method: 'POST' }).then(r => r.connection);

// Launch
export const launchVM = (data: LaunchRequest) =>
  request<{ vm: VM; message: string }>('/launch', { method: 'POST', body: JSON.stringify(data) }).then(r => r.vm);

// Templates
export const fetchTemplates = () => request<{ templates: LaunchableTemplate[] }>('/templates').then(r => r.templates);
export const fetchTemplate = (id: string) => request<{ template: LaunchableTemplate }>(`/templates/${id}`).then(r => r.template);
export const createTemplate = (data: Partial<LaunchableTemplate>) =>
  request<{ template: LaunchableTemplate }>('/templates', { method: 'POST', body: JSON.stringify(data) }).then(r => r.template);
export const updateTemplate = (id: string, data: Partial<LaunchableTemplate>) =>
  request<{ template: LaunchableTemplate }>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.template);
export const deleteTemplate = (id: string) =>
  request<{ message: string }>(`/templates/${id}`, { method: 'DELETE' });

// Region friendly names
const REGION_NAMES: Record<string, string> = {
  'us-east-1': 'US East (N. Virginia)',
  'us-east-2': 'US East (Ohio)',
  'us-west-1': 'US West (N. California)',
  'us-west-2': 'US West (Oregon)',
  'eu-west-1': 'EU (Ireland)',
  'eu-west-2': 'EU (London)',
  'eu-west-3': 'EU (Paris)',
  'eu-central-1': 'EU (Frankfurt)',
  'eu-north-1': 'EU (Stockholm)',
  'ap-south-1': 'Asia Pacific (Mumbai)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'ap-northeast-2': 'Asia Pacific (Seoul)',
  'ap-northeast-3': 'Asia Pacific (Osaka)',
  'sa-east-1': 'South America (São Paulo)',
  'ca-central-1': 'Canada (Central)',
};

function formatMemory(mb: number): string {
  const gb = mb / 1024;
  return gb >= 1 ? `${gb} GiB` : `${mb} MiB`;
}

// Config — transform AWS responses to match frontend expected format
export const fetchRegions = async (): Promise<{ id: string; name: string }[]> => {
  const data = await request<{ regions: { name: string; endpoint: string }[] }>('/config/regions');
  return data.regions
    .map(r => ({
      id: r.name,
      name: REGION_NAMES[r.name] || r.name,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const fetchInstanceTypes = async (): Promise<{ id: string; name: string; vcpu: number; memory: string }[]> => {
  const data = await request<{ instanceTypes: { name: string; vcpus: number; memoryMb: number }[] }>('/config/instance-types');

  // Curated common types that should always appear (with fallback specs)
  const COMMON_TYPES: Record<string, { vcpus: number; memoryMb: number }> = {
    't3.micro':    { vcpus: 2,  memoryMb: 1024 },
    't3.small':    { vcpus: 2,  memoryMb: 2048 },
    't3.medium':   { vcpus: 2,  memoryMb: 4096 },
    't3.large':    { vcpus: 2,  memoryMb: 8192 },
    't3.xlarge':   { vcpus: 4,  memoryMb: 16384 },
    't3.2xlarge':  { vcpus: 8,  memoryMb: 32768 },
    't4g.micro':   { vcpus: 2,  memoryMb: 1024 },
    't4g.small':   { vcpus: 2,  memoryMb: 2048 },
    'm5.large':    { vcpus: 2,  memoryMb: 8192 },
    'm5.xlarge':   { vcpus: 4,  memoryMb: 16384 },
    'c5.large':    { vcpus: 2,  memoryMb: 4096 },
    'c5.xlarge':   { vcpus: 4,  memoryMb: 8192 },
    'g4dn.xlarge': { vcpus: 4,  memoryMb: 16384 },
    'g5.xlarge':   { vcpus: 4,  memoryMb: 16384 },
    'p3.2xlarge':  { vcpus: 8,  memoryMb: 62464 },
  };

  // Build a merged map: API data + common types
  const typeMap = new Map<string, { vcpus: number; memoryMb: number }>();
  for (const [name, specs] of Object.entries(COMMON_TYPES)) {
    typeMap.set(name, specs);
  }
  for (const t of data.instanceTypes) {
    typeMap.set(t.name, { vcpus: t.vcpus, memoryMb: t.memoryMb });
  }

  // Sort: t-series first (free-tier friendly), then alphabetically
  const sorted = Array.from(typeMap.entries()).sort((a, b) => {
    const aIsT = a[0].startsWith('t');
    const bIsT = b[0].startsWith('t');
    if (aIsT && !bIsT) return -1;
    if (!aIsT && bIsT) return 1;
    return a[0].localeCompare(b[0]);
  });

  return sorted.map(([name, specs]) => ({
    id: name,
    name,
    vcpu: specs.vcpus,
    memory: formatMemory(specs.memoryMb),
  }));
};

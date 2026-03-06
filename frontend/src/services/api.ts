import type { ApiResponse, VM, LaunchableTemplate, LaunchRequest, VMConfig } from '../types';

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
  const json: ApiResponse<T> = await res.json();
  if (!json.success && json.error) {
    throw new Error(json.error);
  }
  return json.data as T;
}

// VMs
export const fetchVMs = () => request<VM[]>('/vms');
export const fetchVM = (id: string) => request<VM>(`/vms/${id}`);
export const terminateVM = (id: string) => request<void>(`/vms/${id}`, { method: 'DELETE' });
export const getConnectionInfo = (id: string) => request<{ sshCommand: string; cursorUri: string; pemUrl: string }>(`/vms/${id}/connect`, { method: 'POST' });

// Launch
export const launchVM = (data: LaunchRequest) =>
  request<VM>('/launch', { method: 'POST', body: JSON.stringify(data) });

// Templates
export const fetchTemplates = () => request<LaunchableTemplate[]>('/templates');
export const fetchTemplate = (id: string) => request<LaunchableTemplate>(`/templates/${id}`);
export const createTemplate = (data: Partial<LaunchableTemplate>) =>
  request<LaunchableTemplate>('/templates', { method: 'POST', body: JSON.stringify(data) });
export const updateTemplate = (id: string, data: Partial<LaunchableTemplate>) =>
  request<LaunchableTemplate>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTemplate = (id: string) =>
  request<void>(`/templates/${id}`, { method: 'DELETE' });

// Config
export const fetchRegions = () => request<{ id: string; name: string }[]>('/config/regions');
export const fetchInstanceTypes = () => request<{ id: string; name: string; vcpu: number; memory: string }[]>('/config/instance-types');

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import type { LaunchRequest, LaunchableTemplate } from '../types';

// VM hooks
export function useVMs() {
  return useQuery({
    queryKey: ['vms'],
    queryFn: api.fetchVMs,
    refetchInterval: 10000,
  });
}

export function useVM(id: string) {
  return useQuery({
    queryKey: ['vms', id],
    queryFn: () => api.fetchVM(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useTerminateVM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.terminateVM,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

export function useConnectionInfo(id: string) {
  return useMutation({
    mutationFn: () => api.getConnectionInfo(id),
  });
}

// Launch hook
export function useLaunchVM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LaunchRequest) => api.launchVM(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

// Template hooks
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: api.fetchTemplates,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => api.fetchTemplate(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LaunchableTemplate>) => api.createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LaunchableTemplate> }) =>
      api.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

// Config hooks
export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: api.fetchRegions,
    staleTime: 60 * 60 * 1000,
  });
}

export function useInstanceTypes() {
  return useQuery({
    queryKey: ['instanceTypes'],
    queryFn: api.fetchInstanceTypes,
    staleTime: 60 * 60 * 1000,
  });
}

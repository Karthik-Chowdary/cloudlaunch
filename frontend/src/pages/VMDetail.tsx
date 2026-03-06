import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Paper, alpha, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  IconButton, Tooltip, Skeleton,
} from '@mui/material';
import {
  ArrowBack, Delete, ContentCopy,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { StatusChip, ConnectionInfo, StepProgress } from '../components';
import { useVM, useTerminateVM, useWebSocket } from '../hooks';
import type { StepProgress as StepProgressType, VM } from '../types';
import { useQueryClient } from '@tanstack/react-query';

export default function VMDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: vm, isLoading, error } = useVM(id || '');
  const terminateMutation = useTerminateVM();
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);

  // WebSocket for live updates
  const handleVmUpdate = useCallback(
    (payload: unknown) => {
      // Invalidate query to refetch
      queryClient.invalidateQueries({ queryKey: ['vms', id] });
    },
    [queryClient, id]
  );

  const handleStepOutput = useCallback(
    (stepId: string, output: string) => {
      queryClient.setQueryData(['vms', id], (old: VM | undefined) => {
        if (!old) return old;
        return {
          ...old,
          stepProgress: old.stepProgress.map((sp) =>
            sp.stepId === stepId ? { ...sp, output: sp.output + output } : sp
          ),
        };
      });
    },
    [queryClient, id]
  );

  useWebSocket({
    vmId: id,
    onVmUpdate: handleVmUpdate,
    onStepOutput: handleStepOutput,
  });

  const handleTerminate = async () => {
    if (!id) return;
    try {
      await terminateMutation.mutateAsync(id);
      enqueueSnackbar('VM termination initiated', { variant: 'info' });
    } catch (err: any) {
      enqueueSnackbar(`Failed: ${err.message}`, { variant: 'error' });
    }
    setShowTerminateDialog(false);
  };

  const copyIp = () => {
    if (vm?.publicIp) {
      navigator.clipboard.writeText(vm.publicIp);
      enqueueSnackbar('IP copied', { variant: 'success' });
    }
  };

  function getUptime(createdAt: string, terminatedAt?: string): string {
    const start = new Date(createdAt).getTime();
    const end = terminatedAt ? new Date(terminatedAt).getTime() : Date.now();
    const diff = Math.max(0, end - start);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={50} />
        <Skeleton variant="rounded" width="100%" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" width="100%" height={300} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !vm) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')}>Back</Button>
        <Typography variant="h4" sx={{ mt: 2 }}>VM not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Back + Header */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h3">{vm.name}</Typography>
              <StatusChip status={vm.status} size="medium" />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              {vm.publicIp && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">IP:</Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}
                  >
                    {vm.publicIp}
                  </Typography>
                  <Tooltip title="Copy IP">
                    <IconButton size="small" onClick={copyIp}>
                      <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="text.secondary">Instance</Typography>
                <Typography variant="body1" fontWeight={600}>{vm.config.instanceType}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Region</Typography>
                <Typography variant="body1" fontWeight={600}>{vm.config.region}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Uptime</Typography>
                <Typography variant="body1" fontWeight={600}>{getUptime(vm.createdAt, vm.terminatedAt)}</Typography>
              </Box>
            </Box>
          </Box>

          {vm.status !== 'terminated' && vm.status !== 'terminating' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setShowTerminateDialog(true)}
            >
              Terminate
            </Button>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Connection Info */}
        <Grid size={{ xs: 12, md: 5 }}>
          <ConnectionInfo vm={vm} />
        </Grid>

        {/* Step Progress */}
        <Grid size={{ xs: 12, md: 7 }}>
          <StepProgress steps={vm.steps} progress={vm.stepProgress} />
        </Grid>
      </Grid>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onClose={() => setShowTerminateDialog(false)}>
        <DialogTitle>Terminate VM?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to terminate <strong>{vm.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerminateDialog(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleTerminate}
            disabled={terminateMutation.isPending}
          >
            {terminateMutation.isPending ? 'Terminating...' : 'Terminate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

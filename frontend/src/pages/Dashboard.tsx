import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Chip, Paper, alpha,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Add, Computer, CheckCircle, Error as ErrorIcon, CloudQueue,
  PlayCircle, StopCircle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import { VMCard, DashboardSkeleton, EmptyState } from '../components';
import { useVMs, useTerminateVM } from '../hooks';
import { useAppStore } from '../store';
import type { VM, VMStatus } from '../types';

const statusFilters: { value: VMStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'launching', label: 'Launching' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'failed', label: 'Failed' },
  { value: 'terminated', label: 'Terminated' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: vms, isLoading, error } = useVMs();
  const terminateMutation = useTerminateVM();
  const { statusFilter, setStatusFilter } = useAppStore();
  const [terminateTarget, setTerminateTarget] = useState<VM | null>(null);

  const filteredVMs = vms?.filter(
    (vm) => statusFilter === 'all' || vm.status === statusFilter
  ) || [];

  const stats = {
    total: vms?.length || 0,
    running: vms?.filter((v) => v.status === 'running').length || 0,
    failed: vms?.filter((v) => v.status === 'failed').length || 0,
  };

  const handleOpenCursor = (vm: VM) => {
    const uri = vm.cursorUri || `vscode://vscode-remote/ssh-remote+ubuntu@${vm.publicIp}/home/ubuntu`;
    window.open(uri, '_blank');
  };

  const handleSSH = (vm: VM) => {
    const cmd = vm.sshCommand || `ssh -i ~/.ssh/${vm.keyPairName}.pem ubuntu@${vm.publicIp}`;
    navigator.clipboard.writeText(cmd);
    enqueueSnackbar('SSH command copied to clipboard', { variant: 'success' });
  };

  const handleTerminate = async () => {
    if (!terminateTarget) return;
    try {
      await terminateMutation.mutateAsync(terminateTarget.id);
      enqueueSnackbar(`Terminating ${terminateTarget.name}`, { variant: 'info' });
    } catch (err: any) {
      enqueueSnackbar(`Failed to terminate: ${err.message}`, { variant: 'error' });
    }
    setTerminateTarget(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h2">Dashboard</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>Manage your cloud VMs</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/launch')}
          size="large"
        >
          Launch New
        </Button>
      </Box>

      {/* Stats Banner */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Total VMs', value: stats.total, icon: <CloudQueue />, color: '#00d4ff' },
          { label: 'Running', value: stats.running, icon: <CheckCircle />, color: '#22c55e' },
          { label: 'Failed', value: stats.failed, icon: <ErrorIcon />, color: '#ef4444' },
        ].map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Paper
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: (t) => alpha(stat.color, 0.05),
                  border: (t) => `1px solid ${alpha(stat.color, 0.15)}`,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(stat.color, 0.12),
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h3">{stat.value}</Typography>
                  <Typography variant="body2">{stat.label}</Typography>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, val) => val && setStatusFilter(val)}
          size="small"
        >
          {statusFilters.map((f) => (
            <ToggleButton key={f.value} value={f.value} sx={{ px: 2 }}>
              {f.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* VM Grid */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <EmptyState
          icon={<ErrorIcon />}
          title="Failed to load VMs"
          description={(error as Error).message}
        />
      ) : filteredVMs.length === 0 ? (
        <EmptyState
          icon={<Computer />}
          title={statusFilter === 'all' ? 'No VMs yet' : `No ${statusFilter} VMs`}
          description={statusFilter === 'all' ? 'Launch your first VM to get started.' : 'Try a different filter.'}
          action={
            statusFilter === 'all' ? (
              <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/launch')}>
                Launch New VM
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredVMs.map((vm) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={vm.id}>
                <VMCard
                  vm={vm}
                  onOpenCursor={handleOpenCursor}
                  onSSH={handleSSH}
                  onTerminate={setTerminateTarget}
                  onClick={(vm) => navigate(`/vms/${vm.id}`)}
                />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}

      {/* Terminate Confirmation */}
      <Dialog open={!!terminateTarget} onClose={() => setTerminateTarget(null)}>
        <DialogTitle>Terminate VM?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to terminate <strong>{terminateTarget?.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateTarget(null)}>Cancel</Button>
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

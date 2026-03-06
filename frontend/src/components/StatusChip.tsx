import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import type { VMStatus } from '../types';

const statusConfig: Record<VMStatus, { color: ChipProps['color']; label: string; sx?: object }> = {
  launching: { color: 'info', label: 'Launching' },
  provisioning: { color: 'warning', label: 'Provisioning' },
  running: { color: 'success', label: 'Running' },
  failed: { color: 'error', label: 'Failed' },
  terminating: { color: 'warning', label: 'Terminating', sx: { bgcolor: 'rgba(249,115,22,0.15)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' } },
  terminated: { color: 'default', label: 'Terminated' },
};

interface StatusChipProps {
  status: VMStatus;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const cfg = statusConfig[status] || { color: 'default', label: status };
  return (
    <Chip
      label={cfg.label}
      color={cfg.color}
      size={size}
      variant="outlined"
      sx={{
        fontWeight: 600,
        ...cfg.sx,
      }}
    />
  );
}

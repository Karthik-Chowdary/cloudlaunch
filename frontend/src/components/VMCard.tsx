import React from 'react';
import { Card, CardContent, CardActions, Box, Typography, IconButton, Tooltip, alpha, Chip } from '@mui/material';
import { Terminal, OpenInNew, Delete } from '@mui/icons-material';
import { motion } from 'framer-motion';
import StatusChip from './StatusChip';
import type { VM } from '../types';

interface VMCardProps {
  vm: VM;
  onOpenCursor: (vm: VM) => void;
  onSSH: (vm: VM) => void;
  onTerminate: (vm: VM) => void;
  onClick: (vm: VM) => void;
}

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

export default function VMCard({ vm, onOpenCursor, onSSH, onTerminate, onClick }: VMCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card
        sx={{
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={() => onClick(vm)}
      >
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Typography variant="h5" noWrap sx={{ maxWidth: '60%' }}>
              {vm.name}
            </Typography>
            <StatusChip status={vm.status} />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2">
              <Box component="span" sx={{ color: 'text.secondary' }}>Instance: </Box>
              {vm.config.instanceType}
            </Typography>
            <Typography variant="body2">
              <Box component="span" sx={{ color: 'text.secondary' }}>Region: </Box>
              {vm.config.region}
            </Typography>
            {vm.publicIp && (
              <Typography variant="body2">
                <Box component="span" sx={{ color: 'text.secondary' }}>IP: </Box>
                <Box component="span" sx={{ color: 'primary.main', fontFamily: 'monospace' }}>{vm.publicIp}</Box>
              </Typography>
            )}
            <Typography variant="body2">
              <Box component="span" sx={{ color: 'text.secondary' }}>Uptime: </Box>
              {getUptime(vm.createdAt, vm.terminatedAt)}
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 1.5, pt: 0, justifyContent: 'flex-end' }}>
          {vm.status === 'running' && (
            <>
              <Tooltip title="Open in Cursor">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onOpenCursor(vm); }}
                  sx={{ color: 'primary.main' }}
                >
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="SSH">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onSSH(vm); }}
                  sx={{ color: 'primary.main' }}
                >
                  <Terminal fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {vm.status !== 'terminated' && vm.status !== 'terminating' && (
            <Tooltip title="Terminate">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onTerminate(vm); }}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </CardActions>
      </Card>
    </motion.div>
  );
}

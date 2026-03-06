import React from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Paper, alpha } from '@mui/material';
import { ContentCopy, OpenInNew, Terminal, Download } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import type { VM } from '../types';

interface ConnectionInfoProps {
  vm: VM;
}

export default function ConnectionInfo({ vm }: ConnectionInfoProps) {
  const { enqueueSnackbar } = useSnackbar();

  const cursorUri = vm.cursorUri || (vm.publicIp
    ? `vscode://vscode-remote/ssh-remote+ubuntu@${vm.publicIp}/home/ubuntu`
    : '');
  const sshCommand = vm.sshCommand || (vm.publicIp
    ? `ssh -i ~/.ssh/${vm.keyPairName}.pem ubuntu@${vm.publicIp}`
    : '');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} copied to clipboard`, { variant: 'success' });
  };

  if (vm.status !== 'running') {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Connection info will be available once the VM is running.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Connection</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Open in Cursor */}
        <Button
          variant="contained"
          startIcon={<OpenInNew />}
          href={cursorUri}
          target="_blank"
          fullWidth
          sx={{ justifyContent: 'flex-start' }}
        >
          Open in Cursor
        </Button>

        {/* SSH Command */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>SSH Command</Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: (t) => alpha(t.palette.common.black, 0.3),
              borderRadius: 1,
              px: 2,
              py: 1,
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              color: 'primary.main',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ flex: 1, overflow: 'auto', whiteSpace: 'nowrap' }}>
              {sshCommand}
            </Box>
            <Tooltip title="Copy SSH command">
              <IconButton size="small" onClick={() => copyToClipboard(sshCommand, 'SSH command')}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Download PEM key */}
        <Button
          variant="outlined"
          startIcon={<Download />}
          href={`/api/vms/${vm.id}/connect`}
          fullWidth
          sx={{ justifyContent: 'flex-start' }}
        >
          Download PEM Key ({vm.keyPairName}.pem)
        </Button>
      </Box>
    </Paper>
  );
}

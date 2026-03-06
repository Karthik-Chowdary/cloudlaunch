import React, { useCallback } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Paper, alpha } from '@mui/material';
import { ContentCopy, OpenInNew, Terminal, Download } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { getConnectionInfo } from '../services/api';
import type { VM } from '../types';

interface ConnectionInfoProps {
  vm: VM;
}

export default function ConnectionInfo({ vm }: ConnectionInfoProps) {
  const { enqueueSnackbar } = useSnackbar();

  const cursorUri = vm.publicIp
    ? `cursor://vscode-remote/ssh-remote+ubuntu@${vm.publicIp}/home/ubuntu`
    : '';
  const sshCommand = vm.sshCommand || (vm.publicIp
    ? `ssh -i ~/.ssh/${vm.keyPairName}.pem ubuntu@${vm.publicIp}`
    : '');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar(`${label} copied to clipboard`, { variant: 'success' });
  };

  const handleDownloadPem = useCallback(async () => {
    try {
      const connection = await getConnectionInfo(vm.id);
      if (!connection.privateKey) {
        enqueueSnackbar('Private key not available', { variant: 'error' });
        return;
      }
      const blob = new Blob([connection.privateKey], { type: 'application/x-pem-file' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vm.keyPairName}.pem`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      enqueueSnackbar('PEM key downloaded. Run: chmod 600 ' + vm.keyPairName + '.pem', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to download PEM key', { variant: 'error' });
    }
  }, [vm.id, vm.keyPairName, enqueueSnackbar]);

  const handleOpenCursor = useCallback(() => {
    window.open(cursorUri, '_blank');
  }, [cursorUri]);

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
          onClick={handleOpenCursor}
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

        {/* SSH Config */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Public IP</Typography>
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
            }}
          >
            <Box sx={{ flex: 1 }}>{vm.publicIp}</Box>
            <Tooltip title="Copy IP">
              <IconButton size="small" onClick={() => copyToClipboard(vm.publicIp || '', 'Public IP')}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Download PEM key */}
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleDownloadPem}
          fullWidth
          sx={{ justifyContent: 'flex-start' }}
        >
          Download PEM Key ({vm.keyPairName}.pem)
        </Button>
      </Box>
    </Paper>
  );
}

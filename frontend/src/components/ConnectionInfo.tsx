import React, { useCallback, useState } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Paper, alpha, Alert, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { ContentCopy, OpenInNew, Download, CheckCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { getConnectionInfo } from '../services/api';
import type { VM } from '../types';

interface ConnectionInfoProps {
  vm: VM;
}

export default function ConnectionInfo({ vm }: ConnectionInfoProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [pemDownloaded, setPemDownloaded] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);

  const hostAlias = `cloudlaunch-${vm.name}`;
  const pemFilename = `${vm.keyPairName}.pem`;
  const pemPath = `~/.ssh/${pemFilename}`;

  const sshConfigBlock = vm.publicIp ? `Host ${hostAlias}
  HostName ${vm.publicIp}
  User ubuntu
  IdentityFile ~/.ssh/${pemFilename}
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null` : '';

  const cursorUri = vm.publicIp
    ? `cursor://vscode-remote/ssh-remote+${hostAlias}/home/ubuntu`
    : '';

  const sshCommand = vm.publicIp
    ? `ssh -i ${pemPath} ubuntu@${vm.publicIp}`
    : '';

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
      a.download = pemFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPemDownloaded(true);
      enqueueSnackbar(`PEM key downloaded as ${pemFilename}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to download PEM key', { variant: 'error' });
    }
  }, [vm.id, pemFilename, enqueueSnackbar]);

  const handleCopyConfig = useCallback(() => {
    navigator.clipboard.writeText(sshConfigBlock);
    setConfigCopied(true);
    enqueueSnackbar('SSH config copied — paste into ~/.ssh/config', { variant: 'success' });
  }, [sshConfigBlock, enqueueSnackbar]);

  const handleOpenCursor = useCallback(() => {
    window.open(cursorUri, '_self');
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

      {/* Quick connect steps */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          First time connecting? Follow these 3 steps:
        </Typography>
        <Stepper orientation="vertical" sx={{ mt: 1 }}>
          <Step active completed={pemDownloaded}>
            <StepLabel>
              <Typography variant="body2">
                Download PEM key → move to <code>~/.ssh/</code> → run <code>chmod 600 {pemPath}</code>
              </Typography>
            </StepLabel>
          </Step>
          <Step active completed={configCopied}>
            <StepLabel>
              <Typography variant="body2">
                Copy SSH config below → paste into <code>~/.ssh/config</code>
              </Typography>
            </StepLabel>
          </Step>
          <Step active>
            <StepLabel>
              <Typography variant="body2">
                Click "Open in Cursor"
              </Typography>
            </StepLabel>
          </Step>
        </Stepper>
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Step 1: Download PEM key */}
        <Button
          variant="outlined"
          startIcon={pemDownloaded ? <CheckCircle /> : <Download />}
          onClick={handleDownloadPem}
          color={pemDownloaded ? 'success' : 'primary'}
          fullWidth
          sx={{ justifyContent: 'flex-start' }}
        >
          {pemDownloaded ? `Downloaded ${pemFilename}` : `Download PEM Key (${pemFilename})`}
        </Button>

        {pemDownloaded && (
          <Box sx={{
            bgcolor: (t) => alpha(t.palette.common.black, 0.3),
            borderRadius: 1, px: 2, py: 1,
            fontFamily: 'monospace', fontSize: '0.75rem', color: 'warning.main',
          }}>
            mv ~/Downloads/{pemFilename} ~/.ssh/ && chmod 600 {pemPath}
            <Tooltip title="Copy command">
              <IconButton size="small" sx={{ ml: 1 }}
                onClick={() => copyToClipboard(`mv ~/Downloads/${pemFilename} ~/.ssh/ && chmod 600 ${pemPath}`, 'Move command')}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Step 2: SSH Config */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            SSH Config (paste into ~/.ssh/config)
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              bgcolor: (t) => alpha(t.palette.common.black, 0.3),
              borderRadius: 1, px: 2, py: 1.5,
              fontFamily: 'monospace', fontSize: '0.75rem', color: 'primary.main',
              whiteSpace: 'pre',
            }}
          >
            <Box sx={{ flex: 1 }}>{sshConfigBlock}</Box>
            <Tooltip title={configCopied ? 'Copied!' : 'Copy SSH config'}>
              <IconButton size="small" onClick={handleCopyConfig}
                color={configCopied ? 'success' : 'default'}>
                {configCopied ? <CheckCircle fontSize="small" /> : <ContentCopy fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Step 3: Open in Cursor */}
        <Button
          variant="contained"
          startIcon={<OpenInNew />}
          onClick={handleOpenCursor}
          fullWidth
          size="large"
          sx={{ justifyContent: 'flex-start' }}
        >
          Open in Cursor
        </Button>

        {/* SSH Command (direct) */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>SSH Command (direct)</Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: (t) => alpha(t.palette.common.black, 0.3),
              borderRadius: 1, px: 2, py: 1,
              fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ flex: 1, overflow: 'auto', whiteSpace: 'nowrap' }}>{sshCommand}</Box>
            <Tooltip title="Copy SSH command">
              <IconButton size="small" onClick={() => copyToClipboard(sshCommand, 'SSH command')}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Public IP */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Public IP</Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: (t) => alpha(t.palette.common.black, 0.3),
              borderRadius: 1, px: 2, py: 1,
              fontFamily: 'monospace', fontSize: '0.8125rem', color: 'primary.main',
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
      </Box>
    </Paper>
  );
}

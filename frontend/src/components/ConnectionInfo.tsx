import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  CheckCircle,
  ContentCopy,
  Download,
  ExpandMore,
  OpenInNew,
  Terminal as TerminalIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { keyframes } from '@mui/system';

import { getConnectionInfo, getVMConnectInfo } from '../services/api';
import type { VM } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeleportStatus = 'idle' | 'loading' | 'ready' | 'pending' | 'unavailable' | 'error';

interface ConnectionInfoProps {
  vm: VM;
}

// ---------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------

const pulseGlow = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.45); }
  70%  { box-shadow: 0 0 0 12px rgba(0, 212, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0); }
`;

const pulseRing = keyframes`
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConnectionInfo({ vm }: ConnectionInfoProps) {
  const { enqueueSnackbar } = useSnackbar();

  // Teleport terminal state
  const [teleportStatus, setTeleportStatus] = useState<TeleportStatus>('idle');
  const [teleportUrl, setTeleportUrl] = useState<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Legacy SSH state
  const [pemDownloaded, setPemDownloaded] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Derived SSH helpers
  const hostAlias = `cloudlaunch-${vm.name}`;
  const pemFilename = `${vm.keyPairName}.pem`;
  const pemPath = `~/.ssh/${pemFilename}`;

  const sshConfigBlock = vm.publicIp
    ? `Host ${hostAlias}\n  HostName ${vm.publicIp}\n  User ubuntu\n  IdentityFile ~/.ssh/${pemFilename}\n  StrictHostKeyChecking no\n  UserKnownHostsFile /dev/null`
    : '';

  const cursorUri = vm.publicIp
    ? `cursor://vscode-remote/ssh-remote+${hostAlias}/home/ubuntu`
    : '';

  const sshCommand = vm.publicIp
    ? `ssh -i ${pemPath} ubuntu@${vm.publicIp}`
    : '';

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Teleport connect logic
  // ---------------------------------------------------------------------------

  const attemptConnect = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setTeleportStatus('loading');
      const info = await getVMConnectInfo(vm.id);

      if (!mountedRef.current) return;

      switch (info.status) {
        case 'ready':
          setTeleportStatus('ready');
          setTeleportUrl(info.url);
          window.open(info.url, '_blank', 'noopener,noreferrer');
          break;

        case 'pending':
          setTeleportStatus('pending');
          setTeleportUrl(null);
          // Auto-retry every 3 seconds
          retryTimerRef.current = setTimeout(() => {
            if (mountedRef.current) attemptConnect();
          }, 3000);
          break;

        case 'unavailable':
          setTeleportStatus('unavailable');
          setTeleportUrl(null);
          setAdvancedOpen(true); // auto-expand fallback
          enqueueSnackbar(
            'Web terminal unavailable — use SSH key access below',
            { variant: 'warning' },
          );
          break;

        default:
          setTeleportStatus('error');
          break;
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setTeleportStatus('error');
      enqueueSnackbar('Failed to connect to terminal service', { variant: 'error' });
    }
  }, [vm.id, enqueueSnackbar]);

  const handleOpenTerminal = useCallback(() => {
    // If we already have a ready URL, just reopen
    if (teleportStatus === 'ready' && teleportUrl) {
      window.open(teleportUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // Clear any pending retry
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    attemptConnect();
  }, [teleportStatus, teleportUrl, attemptConnect]);

  const handleCancelPending = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setTeleportStatus('idle');
  }, []);

  // ---------------------------------------------------------------------------
  // Legacy SSH handlers (kept verbatim from original)
  // ---------------------------------------------------------------------------

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      enqueueSnackbar(`${label} copied to clipboard`, { variant: 'success' });
    },
    [enqueueSnackbar],
  );

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
    } catch {
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

  // ---------------------------------------------------------------------------
  // Status indicator helpers
  // ---------------------------------------------------------------------------

  const statusDot = (color: string, animate = false) => (
    <Box
      sx={{
        position: 'relative',
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: color,
        flexShrink: 0,
        ...(animate && {
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            bgcolor: color,
            animation: `${pulseRing} 1.5s ease-out infinite`,
          },
        }),
      }}
    />
  );

  const statusLabel = (): { color: string; text: string; animate: boolean } => {
    switch (teleportStatus) {
      case 'ready':
        return { color: '#22c55e', text: 'Agent connected', animate: false };
      case 'pending':
      case 'loading':
        return { color: '#eab308', text: 'Connecting…', animate: true };
      case 'unavailable':
        return { color: '#ef4444', text: 'Agent unavailable', animate: false };
      case 'error':
        return { color: '#ef4444', text: 'Connection error', animate: false };
      default:
        return { color: '#94a3b8', text: 'Ready to connect', animate: false };
    }
  };

  // ---------------------------------------------------------------------------
  // Render: VM not running
  // ---------------------------------------------------------------------------

  if (vm.status !== 'running') {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Connection info will be available once the VM is running.
        </Typography>
      </Paper>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Primary UI
  // ---------------------------------------------------------------------------

  const { color: dotColor, text: dotText, animate: dotAnimate } = statusLabel();

  return (
    <Paper sx={{ p: 3 }}>
      {/* ── Header ─────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TerminalIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h5">Terminal Access</Typography>
        </Box>

        {/* Subtle status indicator */}
        <Tooltip title={dotText} placement="left">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'default' }}>
            {statusDot(dotColor, dotAnimate)}
            <Typography
              variant="body2"
              sx={{
                color: dotColor,
                fontSize: '0.75rem',
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {dotText}
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* ── Primary Action: Open Web Terminal ──────── */}
      <Box sx={{ mb: 3 }}>
        {teleportStatus === 'pending' ? (
          /* Pending / pulsing state */
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled
              sx={{
                py: 2,
                fontSize: '1rem',
                animation: `${pulseGlow} 2s ease-in-out infinite`,
                '&.Mui-disabled': {
                  background: (t) =>
                    `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.4)}, ${alpha(
                      t.palette.secondary.main,
                      0.4,
                    )})`,
                  color: 'text.secondary',
                },
              }}
              startIcon={<CircularProgress size={20} sx={{ color: 'primary.main' }} />}
            >
              Connecting to terminal…
            </Button>
            <Button size="small" variant="text" onClick={handleCancelPending} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
          </Box>
        ) : (
          /* Normal / ready / error / unavailable state */
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleOpenTerminal}
            disabled={teleportStatus === 'loading'}
            startIcon={
              teleportStatus === 'loading' ? (
                <CircularProgress size={20} sx={{ color: 'inherit' }} />
              ) : teleportStatus === 'ready' ? (
                <OpenInNew />
              ) : (
                <TerminalIcon />
              )
            }
            sx={{
              py: 2,
              fontSize: '1rem',
              ...(teleportStatus === 'ready' && {
                background: (t) =>
                  `linear-gradient(135deg, ${t.palette.success.main}, ${t.palette.success.dark})`,
                boxShadow: (t) => `0 4px 14px ${alpha(t.palette.success.main, 0.35)}`,
                '&:hover': {
                  background: (t) =>
                    `linear-gradient(135deg, ${t.palette.success.light}, ${t.palette.success.main})`,
                  boxShadow: (t) => `0 6px 20px ${alpha(t.palette.success.main, 0.5)}`,
                },
              }),
            }}
          >
            {teleportStatus === 'loading'
              ? 'Connecting…'
              : teleportStatus === 'ready'
                ? 'Open Web Terminal'
                : teleportStatus === 'unavailable'
                  ? 'Retry Web Terminal'
                  : teleportStatus === 'error'
                    ? 'Retry Web Terminal'
                    : 'Open Web Terminal'}
          </Button>
        )}

        {/* Helper text */}
        {teleportStatus !== 'pending' && (
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', mt: 1, color: 'text.secondary', fontSize: '0.75rem' }}
          >
            {teleportStatus === 'ready'
              ? 'Terminal is ready — opens in a new tab'
              : teleportStatus === 'unavailable'
                ? 'Teleport agent is not available — try SSH below'
                : teleportStatus === 'error'
                  ? 'Could not reach terminal service'
                  : 'Browser-based SSH via Teleport — no keys required'}
          </Typography>
        )}
      </Box>

      {/* ── Advanced: SSH Key Access (Collapsible) ── */}
      <Accordion
        expanded={advancedOpen}
        onChange={(_, expanded) => setAdvancedOpen(expanded)}
        disableGutters
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          border: (t) => `1px solid ${alpha(t.palette.divider, 1)}`,
          borderRadius: '12px !important',
          '&::before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}
          sx={{
            minHeight: 48,
            px: 2,
            '& .MuiAccordionSummary-content': { my: 1 },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Advanced: SSH Key Access
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
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
              <CodeBlock
                content={`mv ~/Downloads/${pemFilename} ~/.ssh/ && chmod 600 ${pemPath}`}
                onCopy={() =>
                  copyToClipboard(
                    `mv ~/Downloads/${pemFilename} ~/.ssh/ && chmod 600 ${pemPath}`,
                    'Move command',
                  )
                }
                color="warning.main"
              />
            )}

            {/* Step 2: SSH Config */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                SSH Config (paste into ~/.ssh/config)
              </Typography>
              <CodeBlock content={sshConfigBlock} onCopy={handleCopyConfig} copied={configCopied} />
            </Box>

            {/* Step 3: Open in Cursor */}
            <Button
              variant="outlined"
              startIcon={<OpenInNew />}
              onClick={handleOpenCursor}
              fullWidth
              sx={{ justifyContent: 'flex-start' }}
            >
              Open in Cursor
            </Button>

            {/* SSH Command (direct) */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                SSH Command (direct)
              </Typography>
              <CodeBlock
                content={sshCommand}
                onCopy={() => copyToClipboard(sshCommand, 'SSH command')}
                mono
              />
            </Box>

            {/* Public IP */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Public IP
              </Typography>
              <CodeBlock
                content={vm.publicIp || '—'}
                onCopy={() => copyToClipboard(vm.publicIp || '', 'Public IP')}
                mono
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Reusable code-block sub-component
// ---------------------------------------------------------------------------

interface CodeBlockProps {
  content: string;
  onCopy: () => void;
  copied?: boolean;
  color?: string;
  mono?: boolean;
}

function CodeBlock({ content, onCopy, copied, color = 'primary.main', mono }: CodeBlockProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        bgcolor: (t) => alpha(t.palette.common.black, 0.3),
        borderRadius: 1,
        px: 2,
        py: 1.5,
        fontFamily: 'monospace',
        fontSize: mono ? '0.8125rem' : '0.75rem',
        color,
        whiteSpace: 'pre',
        overflowX: 'auto',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>{content}</Box>
      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
        <IconButton size="small" onClick={onCopy} color={copied ? 'success' : 'default'}>
          {copied ? <CheckCircle fontSize="small" /> : <ContentCopy fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

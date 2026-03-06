import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Collapse, IconButton, alpha, LinearProgress, Chip,
} from '@mui/material';
import {
  CheckCircle, Error as ErrorIcon, HourglassEmpty, PlayCircle, SkipNext,
  ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { StepProgress as StepProgressType, LaunchStep } from '../types';

interface StepProgressProps {
  steps: LaunchStep[];
  progress: StepProgressType[];
}

const statusIcon: Record<string, React.ReactNode> = {
  pending: <HourglassEmpty sx={{ color: 'text.secondary', fontSize: 20 }} />,
  running: <PlayCircle sx={{ color: 'info.main', fontSize: 20 }} />,
  completed: <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />,
  failed: <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />,
  skipped: <SkipNext sx={{ color: 'text.secondary', fontSize: 20 }} />,
};

const statusColor: Record<string, string> = {
  pending: '#64748b',
  running: '#00d4ff',
  completed: '#22c55e',
  failed: '#ef4444',
  skipped: '#64748b',
};

function getDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return '';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function StepItem({
  step,
  prog,
  index,
  isLast,
}: {
  step: LaunchStep;
  prog?: StepProgressType;
  index: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(prog?.status === 'running' || prog?.status === 'failed');
  const logRef = useRef<HTMLPreElement>(null);

  const status = prog?.status || 'pending';

  useEffect(() => {
    if (prog?.status === 'running' || prog?.status === 'failed') {
      setExpanded(true);
    }
  }, [prog?.status]);

  useEffect(() => {
    if (logRef.current && expanded) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [prog?.output, expanded]);

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Vertical line + icon */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
        <motion.div
          animate={status === 'running' ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {statusIcon[status]}
        </motion.div>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: statusColor[status],
              opacity: 0.3,
              mt: 0.5,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, pb: isLast ? 0 : 2, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: prog?.output ? 'pointer' : 'default',
          }}
          onClick={() => prog?.output && setExpanded(!expanded)}
        >
          <Typography variant="body1" fontWeight={600} sx={{ color: statusColor[status] }}>
            {step.name}
          </Typography>
          {prog?.startedAt && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              {getDuration(prog.startedAt, prog.completedAt)}
            </Typography>
          )}
          {status === 'running' && (
            <LinearProgress
              sx={{ flex: 1, maxWidth: 100, height: 3, borderRadius: 2 }}
            />
          )}
          {prog?.output && (
            <IconButton size="small">
              {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          )}
        </Box>

        {prog?.error && (
          <Typography variant="body2" sx={{ color: 'error.main', mt: 0.5 }}>
            {prog.error}
          </Typography>
        )}

        <Collapse in={expanded}>
          {prog?.output && (
            <Box
              ref={logRef}
              component="pre"
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: (t) => alpha(t.palette.common.black, 0.4),
                borderRadius: 1,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '0.75rem',
                lineHeight: 1.6,
                color: '#94a3b8',
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {prog.output}
            </Box>
          )}
        </Collapse>
      </Box>
    </Box>
  );
}

export default function StepProgress({ steps, progress }: StepProgressProps) {
  const progressMap = new Map(progress.map((p) => [p.stepId, p]));

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Step Progress</Typography>
      <Box>
        {steps.map((step, i) => (
          <StepItem
            key={step.id}
            step={step}
            prog={progressMap.get(step.id)}
            index={i}
            isLast={i === steps.length - 1}
          />
        ))}
      </Box>
    </Paper>
  );
}

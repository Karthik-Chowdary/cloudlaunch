import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, FormControlLabel, Switch, Typography, alpha,
} from '@mui/material';
import Editor from '@monaco-editor/react';
import type { LaunchStep } from '../types';


interface StepEditorProps {
  open: boolean;
  step?: LaunchStep | null;
  onSave: (step: LaunchStep) => void;
  onClose: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function StepEditor({ open, step, onSave, onClose }: StepEditorProps) {
  const [name, setName] = useState(step?.name || '');
  const [description, setDescription] = useState(step?.description || '');
  const [script, setScript] = useState(step?.script || '#!/bin/bash\nset -euo pipefail\n\n');
  const [timeout, setTimeout_] = useState(step?.timeout || 300);
  const [continueOnError, setContinueOnError] = useState(step?.continueOnError || false);

  React.useEffect(() => {
    if (open) {
      setName(step?.name || '');
      setDescription(step?.description || '');
      setScript(step?.script || '#!/bin/bash\nset -euo pipefail\n\n');
      setTimeout_(step?.timeout || 300);
      setContinueOnError(step?.continueOnError || false);
    }
  }, [open, step]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: step?.id || generateId(),
      name: name.trim(),
      description: description.trim(),
      script,
      timeout,
      continueOnError,
      order: step?.order || 0,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{step ? 'Edit Step' : 'Add Step'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Step Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Install Docker"
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="What this step does..."
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Script (Bash)
            </Typography>
            <Box
              sx={{
                border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Editor
                height="300px"
                defaultLanguage="shell"
                language="shell"
                value={script}
                onChange={(value) => setScript(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  padding: { top: 8, bottom: 8 },
                }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Timeout (seconds)"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              sx={{ width: 200 }}
              inputProps={{ min: 10 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={continueOnError}
                  onChange={(e) => setContinueOnError(e.target.checked)}
                  color="primary"
                />
              }
              label="Continue on error"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {step ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

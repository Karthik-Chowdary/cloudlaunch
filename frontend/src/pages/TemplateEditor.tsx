import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, TextField, Grid, Chip, alpha,
  IconButton, CircularProgress,
} from '@mui/material';
import { Save, ArrowBack, Close, Add } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { StepList } from '../components';
import { useTemplate, useCreateTemplate, useUpdateTemplate } from '../hooks';
import type { LaunchStep } from '../types';

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isEditing = !!id;

  const { data: existing, isLoading } = useTemplate(id || '');
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📦');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [instanceType, setInstanceType] = useState('t3.medium');
  const [region, setRegion] = useState('us-east-1');
  const [ami, setAmi] = useState('');
  const [diskSize, setDiskSize] = useState(50);
  const [steps, setSteps] = useState<LaunchStep[]>([]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setIcon(existing.icon || '📦');
      setTags(existing.tags);
      setInstanceType(existing.defaultConfig.instanceType);
      setRegion(existing.defaultConfig.region);
      setAmi(existing.defaultConfig.ami);
      setDiskSize(existing.defaultConfig.diskSizeGb);
      setSteps([...existing.steps]);
    }
  }, [existing]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      enqueueSnackbar('Name is required', { variant: 'warning' });
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      icon,
      tags,
      steps,
      defaultConfig: {
        instanceType,
        region,
        ami,
        diskSizeGb: diskSize,
        tags: {},
      },
    };

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        enqueueSnackbar('Template updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Template created', { variant: 'success' });
      }
      navigate('/launchables');
    } catch (err: any) {
      enqueueSnackbar(`Failed: ${err.message}`, { variant: 'error' });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/launchables')} sx={{ mb: 2 }}>
        Back to Launchables
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h2">{isEditing ? 'Edit Template' : 'Create Template'}</Typography>
        <Button
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={18} /> : <Save />}
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          size="large"
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </Box>

      {/* Basic Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Basic Info</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              label="Icon (emoji)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              fullWidth
              inputProps={{ style: { fontSize: 28, textAlign: 'center' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 10 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., ML Dev Environment"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="What this template sets up..."
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => handleRemoveTag(tag)}
                  variant="outlined"
                />
              ))}
              <TextField
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                size="small"
                sx={{ width: 140 }}
              />
              <IconButton size="small" onClick={handleAddTag} disabled={!tagInput.trim()}>
                <Add fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Default VM Config */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Default VM Configuration</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Instance Type"
              value={instanceType}
              onChange={(e) => setInstanceType(e.target.value)}
              fullWidth
              placeholder="t3.medium"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              fullWidth
              placeholder="us-east-1"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="AMI"
              value={ami}
              onChange={(e) => setAmi(e.target.value)}
              fullWidth
              placeholder="ami-xxxxxxxxxxxx (optional)"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Disk Size (GB)"
              type="number"
              value={diskSize}
              onChange={(e) => setDiskSize(Number(e.target.value))}
              fullWidth
              inputProps={{ min: 8, max: 2000 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Steps */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Setup Steps</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Define the steps that will run after VM boot. Drag to reorder.
        </Typography>
        <StepList steps={steps} onChange={setSteps} />
      </Paper>
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stepper, Step, StepLabel, Paper,
  TextField, MenuItem, Grid, alpha, Chip, Divider, CircularProgress,
} from '@mui/material';
import { RocketLaunch, NavigateNext, NavigateBefore } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSnackbar } from 'notistack';
import { StepList, TemplateCard, TemplatesSkeleton, EmptyState } from '../components';
import { useTemplates, useTemplate, useRegions, useInstanceTypes, useLaunchVM } from '../hooks';
import type { LaunchStep, LaunchableTemplate, VMConfig } from '../types';

const wizardSteps = ['Select Template', 'Configure VM', 'Setup Steps', 'Review & Launch'];

function generateName(): string {
  const adj = ['swift', 'brave', 'cosmic', 'lunar', 'solar', 'rapid', 'bright', 'bold'];
  const nouns = ['falcon', 'phoenix', 'nova', 'comet', 'pulsar', 'nebula', 'quasar', 'vortex'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${a}-${n}-${num}`;
}

export default function LaunchWizard() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: templates, isLoading: loadingTemplates } = useTemplates();
  const { data: preselectedTemplate } = useTemplate(templateId || '');
  const { data: regions } = useRegions();
  const { data: instanceTypes } = useInstanceTypes();
  const launchMutation = useLaunchVM();

  const [activeStep, setActiveStep] = useState(templateId ? 1 : 0);
  const [selectedTemplate, setSelectedTemplate] = useState<LaunchableTemplate | null>(null);

  const [vmName, setVmName] = useState(generateName());
  const [instanceType, setInstanceType] = useState('t3.micro');
  const [region, setRegion] = useState('us-east-1');
  const [diskSize, setDiskSize] = useState(50);
  const [steps, setSteps] = useState<LaunchStep[]>([]);

  // Apply preselected template
  useEffect(() => {
    if (preselectedTemplate && !selectedTemplate) {
      setSelectedTemplate(preselectedTemplate);
      setInstanceType(preselectedTemplate.defaultConfig.instanceType);
      setRegion(preselectedTemplate.defaultConfig.region);
      setDiskSize(preselectedTemplate.defaultConfig.diskSizeGb);
      setSteps([...preselectedTemplate.steps]);
    }
  }, [preselectedTemplate, selectedTemplate]);

  const handleSelectTemplate = (template: LaunchableTemplate) => {
    setSelectedTemplate(template);
    setInstanceType(template.defaultConfig.instanceType);
    setRegion(template.defaultConfig.region);
    setDiskSize(template.defaultConfig.diskSizeGb);
    setSteps([...template.steps]);
    setActiveStep(1);
  };

  const handleLaunch = async () => {
    try {
      const result = await launchMutation.mutateAsync({
        name: vmName,
        templateId: selectedTemplate?.id,
        config: {
          instanceType,
          region,
          diskSizeGb: diskSize,
        },
        steps,
      });
      enqueueSnackbar('VM launch initiated!', { variant: 'success' });
      navigate(`/vms/${result.id}`);
    } catch (err: any) {
      enqueueSnackbar(`Launch failed: ${err.message}`, { variant: 'error' });
    }
  };

  const canGoNext = () => {
    switch (activeStep) {
      case 0: return !!selectedTemplate;
      case 1: return !!vmName.trim();
      case 2: return true;
      case 3: return !launchMutation.isPending;
      default: return false;
    }
  };

  // Fallback regions/instances for when API isn't available
  const regionOptions = regions?.length ? regions : [
    { id: 'us-east-1', name: 'US East (N. Virginia)' },
    { id: 'us-east-2', name: 'US East (Ohio)' },
    { id: 'us-west-1', name: 'US West (N. California)' },
    { id: 'us-west-2', name: 'US West (Oregon)' },
    { id: 'eu-west-1', name: 'EU (Ireland)' },
    { id: 'eu-central-1', name: 'EU (Frankfurt)' },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
  ];

  const instanceTypeOptions = instanceTypes?.length ? instanceTypes : [
    { id: 't3.micro', name: 't3.micro', vcpu: 2, memory: '1 GiB' },
    { id: 't3.small', name: 't3.small', vcpu: 2, memory: '2 GiB' },
    { id: 't3.medium', name: 't3.medium', vcpu: 2, memory: '4 GiB' },
    { id: 't3.large', name: 't3.large', vcpu: 2, memory: '8 GiB' },
    { id: 't3.xlarge', name: 't3.xlarge', vcpu: 4, memory: '16 GiB' },
    { id: 'm5.large', name: 'm5.large', vcpu: 2, memory: '8 GiB' },
    { id: 'm5.xlarge', name: 'm5.xlarge', vcpu: 4, memory: '16 GiB' },
    { id: 'g4dn.xlarge', name: 'g4dn.xlarge', vcpu: 4, memory: '16 GiB' },
    { id: 'g5.xlarge', name: 'g5.xlarge', vcpu: 4, memory: '16 GiB' },
    { id: 'p3.2xlarge', name: 'p3.2xlarge', vcpu: 8, memory: '61 GiB' },
  ];

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Choose a Template</Typography>
            {loadingTemplates ? (
              <TemplatesSkeleton />
            ) : !templates?.length ? (
              <EmptyState
                icon={<RocketLaunch />}
                title="No templates available"
                description="Create a template first, or skip to configure manually."
                action={
                  <Button variant="outlined" onClick={() => {
                    setSelectedTemplate({
                      id: '',
                      name: 'Custom',
                      description: 'Custom configuration',
                      tags: [],
                      steps: [],
                      defaultConfig: { instanceType: 't3.medium', region: 'us-east-1', ami: '', diskSizeGb: 50, tags: {} },
                      createdAt: '',
                      updatedAt: '',
                    });
                    setActiveStep(1);
                  }}>
                    Skip — Configure Manually
                  </Button>
                }
              />
            ) : (
              <Grid container spacing={3}>
                {templates.map((t) => (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={t.id}>
                    <TemplateCard
                      template={t}
                      onLaunch={handleSelectTemplate}
                      onEdit={() => {}}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Configure VM</Typography>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="VM Name"
                    value={vmName}
                    onChange={(e) => setVmName(e.target.value)}
                    fullWidth
                    required
                    helperText="A unique name for your VM"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Instance Type"
                    value={instanceType}
                    onChange={(e) => setInstanceType(e.target.value)}
                    select
                    fullWidth
                  >
                    {instanceTypeOptions.map((it) => (
                      <MenuItem key={it.id} value={it.id}>
                        {it.name} — {it.vcpu} vCPU, {it.memory}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    select
                    fullWidth
                  >
                    {regionOptions.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name} ({r.id})
                      </MenuItem>
                    ))}
                  </TextField>
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
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Setup Steps</Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Configure the steps that will run after your VM boots. Drag to reorder.
            </Typography>
            <StepList steps={steps} onChange={setSteps} />
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>Review & Launch</Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>VM Configuration</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1" fontWeight={600}>{vmName}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="body2" color="text.secondary">Instance Type</Typography>
                  <Typography variant="body1" fontWeight={600}>{instanceType}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="body2" color="text.secondary">Region</Typography>
                  <Typography variant="body1" fontWeight={600}>{region}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="body2" color="text.secondary">Disk</Typography>
                  <Typography variant="body1" fontWeight={600}>{diskSize} GB</Typography>
                </Grid>
              </Grid>

              {selectedTemplate?.name && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">Template</Typography>
                  <Chip label={selectedTemplate.name} size="small" sx={{ mt: 0.5 }} />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="h5" sx={{ mb: 2 }}>Steps ({steps.length})</Typography>
              {steps.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No setup steps configured.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {steps.map((step, i) => (
                    <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={i + 1}
                        size="small"
                        sx={{
                          minWidth: 28,
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                          color: 'primary.main',
                          fontWeight: 700,
                        }}
                      />
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{step.name}</Typography>
                        {step.description && (
                          <Typography variant="body2">{step.description}</Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 4 }}>Launch VM</Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {wizardSteps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <motion.div
        key={activeStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderStepContent()}
      </motion.div>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          startIcon={<NavigateBefore />}
          onClick={() => setActiveStep((s) => s - 1)}
          disabled={activeStep === 0}
        >
          Back
        </Button>

        {activeStep < wizardSteps.length - 1 ? (
          <Button
            variant="contained"
            endIcon={<NavigateNext />}
            onClick={() => setActiveStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={launchMutation.isPending ? <CircularProgress size={18} /> : <RocketLaunch />}
            onClick={handleLaunch}
            disabled={launchMutation.isPending}
            size="large"
          >
            {launchMutation.isPending ? 'Launching...' : 'Launch VM'}
          </Button>
        )}
      </Box>
    </Box>
  );
}

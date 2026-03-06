import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid } from '@mui/material';
import { Add, RocketLaunch } from '@mui/icons-material';
import { AnimatePresence } from 'framer-motion';
import { TemplateCard, TemplatesSkeleton, EmptyState } from '../components';
import { useTemplates } from '../hooks';
import type { LaunchableTemplate } from '../types';

export default function Launchables() {
  const navigate = useNavigate();
  const { data: templates, isLoading, error } = useTemplates();

  const handleLaunch = (template: LaunchableTemplate) => {
    navigate(`/launch/${template.id}`);
  };

  const handleEdit = (template: LaunchableTemplate) => {
    navigate(`/launchables/${template.id}/edit`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h2">Launchables</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>Pre-configured VM templates</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/launchables/new')}
        >
          Create Template
        </Button>
      </Box>

      {isLoading ? (
        <TemplatesSkeleton />
      ) : error ? (
        <EmptyState
          icon={<RocketLaunch />}
          title="Failed to load templates"
          description={(error as Error).message}
        />
      ) : !templates?.length ? (
        <EmptyState
          icon={<RocketLaunch />}
          title="No templates yet"
          description="Create a template to define reusable VM configurations with setup steps."
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/launchables/new')}>
              Create Template
            </Button>
          }
        />
      ) : (
        <Grid container spacing={3}>
          <AnimatePresence>
            {templates.map((template) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={template.id}>
                <TemplateCard
                  template={template}
                  onLaunch={handleLaunch}
                  onEdit={handleEdit}
                />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}
    </Box>
  );
}

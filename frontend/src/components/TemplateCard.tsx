import React from 'react';
import { Card, CardContent, CardActions, Box, Typography, Button, Chip, alpha } from '@mui/material';
import { Verified, Edit } from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { LaunchableTemplate } from '../types';

interface TemplateCardProps {
  template: LaunchableTemplate;
  onLaunch: (template: LaunchableTemplate) => void;
  onEdit: (template: LaunchableTemplate) => void;
}

export default function TemplateCard({ template, onLaunch, onEdit }: TemplateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                flexShrink: 0,
              }}
            >
              {template.icon || '📦'}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" noWrap>
                  {template.name}
                </Typography>
                {template.builtIn && (
                  <Verified sx={{ fontSize: 16, color: 'primary.main' }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
                {template.description}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {template.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ borderColor: (t) => alpha(t.palette.primary.main, 0.2), fontSize: '0.7rem' }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2">
              <Box component="span" sx={{ color: 'text.secondary' }}>{template.steps.length} steps</Box>
            </Typography>
            <Typography variant="body2">
              <Box component="span" sx={{ color: 'text.secondary' }}>{template.defaultConfig.instanceType}</Box>
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 1.5, pt: 0, gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => onLaunch(template)}
            sx={{ flex: 1 }}
          >
            Launch
          </Button>
          {!template.builtIn && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Edit />}
              onClick={() => onEdit(template)}
            >
              Edit
            </Button>
          )}
        </CardActions>
      </Card>
    </motion.div>
  );
}

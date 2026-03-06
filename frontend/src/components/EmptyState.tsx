import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 10,
          px: 4,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            mb: 3,
            '& .MuiSvgIcon-root': {
              fontSize: 40,
              color: 'primary.main',
            },
          }}
        >
          {icon}
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
        {action}
      </Box>
    </motion.div>
  );
}

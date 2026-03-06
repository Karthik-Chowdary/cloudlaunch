import React from 'react';
import { Skeleton, Card, CardContent, Grid, Box } from '@mui/material';

export function VMCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width={140} height={28} />
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={20} />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton variant="rounded" width={60} height={28} />
          <Skeleton variant="rounded" width={60} height={28} />
          <Skeleton variant="rounded" width={60} height={28} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function TemplateCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={120} height={24} />
            <Skeleton variant="text" width="80%" height={18} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={50} height={22} />
          <Skeleton variant="rounded" width={50} height={22} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
          <VMCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}

export function TemplatesSkeleton() {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
          <TemplateCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}

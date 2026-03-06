import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, alpha, Divider, useMediaQuery, IconButton, AppBar, Toolbar,
} from '@mui/material';
import { Dashboard, RocketLaunch, AddCircle, Menu as MenuIcon, Cloud } from '@mui/icons-material';
import { useAppStore } from '../store';

const SIDEBAR_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'Launchables', icon: <RocketLaunch />, path: '/launchables' },
  { label: 'Launch', icon: <AddCircle />, path: '/launch' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const isMobile = useMediaQuery('(max-width:768px)');

  const drawerVariant = isMobile ? 'temporary' : 'persistent';
  const open = isMobile ? sidebarOpen : true;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant={drawerVariant}
        open={open}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Cloud sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography
            variant="h4"
            sx={{
              background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
            }}
          >
            CloudLaunch
          </Typography>
        </Box>

        <Divider />

        <List sx={{ px: 1, py: 2 }}>
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setSidebarOpen(false);
                }}
                sx={{ mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'primary.main' : 'text.secondary',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isMobile && (
          <AppBar position="sticky">
            <Toolbar>
              <IconButton edge="start" onClick={toggleSidebar} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
              <Cloud sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" sx={{ color: 'primary.main' }}>CloudLaunch</Typography>
            </Toolbar>
          </AppBar>
        )}
        <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto', width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

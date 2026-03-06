import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { theme } from './theme';
import { Layout } from './components';
import Dashboard from './pages/Dashboard';
import Launchables from './pages/Launchables';
import LaunchWizard from './pages/LaunchWizard';
import VMDetail from './pages/VMDetail';
import TemplateEditor from './pages/TemplateEditor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          autoHideDuration={4000}
        >
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/launchables" element={<Launchables />} />
                <Route path="/launchables/new" element={<TemplateEditor />} />
                <Route path="/launchables/:id/edit" element={<TemplateEditor />} />
                <Route path="/launch" element={<LaunchWizard />} />
                <Route path="/launch/:templateId" element={<LaunchWizard />} />
                <Route path="/vms/:id" element={<VMDetail />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

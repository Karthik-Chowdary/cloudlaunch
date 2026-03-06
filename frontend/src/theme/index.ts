import { createTheme, alpha } from '@mui/material/styles';

const PRIMARY_CYAN = '#00d4ff';
const PRIMARY_PURPLE = '#7c3aed';
const BG_DARK = '#0a0e1a';
const BG_PAPER = '#0f1429';
const BG_CARD = '#141b2d';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.06)';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: PRIMARY_CYAN,
      light: '#33ddff',
      dark: '#009ec2',
      contrastText: '#0a0e1a',
    },
    secondary: {
      main: PRIMARY_PURPLE,
      light: '#9b6bff',
      dark: '#5b21b6',
    },
    background: {
      default: BG_DARK,
      paper: BG_PAPER,
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    warning: {
      main: '#eab308',
      light: '#facc15',
      dark: '#ca8a04',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      main: PRIMARY_CYAN,
    },
    divider: BORDER_COLOR,
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.6,
      color: '#94a3b8',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(PRIMARY_CYAN, 0.3)} transparent`,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(PRIMARY_CYAN, 0.3),
            borderRadius: 3,
          },
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(PRIMARY_CYAN, 0.3)} transparent`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
        },
        contained: {
          background: `linear-gradient(135deg, ${PRIMARY_CYAN}, ${PRIMARY_PURPLE})`,
          boxShadow: `0 4px 14px ${alpha(PRIMARY_CYAN, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${PRIMARY_CYAN}, ${PRIMARY_PURPLE})`,
            boxShadow: `0 6px 20px ${alpha(PRIMARY_CYAN, 0.5)}`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: alpha(PRIMARY_CYAN, 0.3),
          color: PRIMARY_CYAN,
          '&:hover': {
            borderColor: PRIMARY_CYAN,
            background: alpha(PRIMARY_CYAN, 0.08),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: BG_CARD,
          border: `1px solid ${BORDER_COLOR}`,
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${alpha(BG_CARD, 0.8)}, ${alpha(BG_PAPER, 0.6)})`,
          border: `1px solid ${BORDER_COLOR}`,
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s ease',
          '&:hover': {
            border: `1px solid ${alpha(PRIMARY_CYAN, 0.15)}`,
            boxShadow: `0 8px 32px ${alpha(PRIMARY_CYAN, 0.08)}`,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: '0.75rem',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: BORDER_COLOR,
            },
            '&:hover fieldset': {
              borderColor: alpha(PRIMARY_CYAN, 0.3),
            },
            '&.Mui-focused fieldset': {
              borderColor: PRIMARY_CYAN,
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_PAPER,
          borderRight: `1px solid ${BORDER_COLOR}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(BG_DARK, 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${BORDER_COLOR}`,
          boxShadow: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: alpha(BG_CARD, 0.95),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${BORDER_COLOR}`,
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#ffffff', 0.05),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: alpha(PRIMARY_CYAN, 0.1),
        },
        bar: {
          borderRadius: 4,
          background: `linear-gradient(90deg, ${PRIMARY_CYAN}, ${PRIMARY_PURPLE})`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_PAPER,
          border: `1px solid ${BORDER_COLOR}`,
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: BORDER_COLOR,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: BORDER_COLOR,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.Mui-selected': {
            background: alpha(PRIMARY_CYAN, 0.1),
            '&:hover': {
              background: alpha(PRIMARY_CYAN, 0.15),
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
        },
      },
    },
  },
});

export default theme;

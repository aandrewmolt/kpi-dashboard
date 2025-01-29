import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Layout components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// Page components
import Dashboard from './components/Dashboard/Dashboard';
import Operators from './components/Operators/Operators';
import Pads from './components/Pads/Pads';
import Jobs from './components/Jobs/Jobs';
import Incidents from './components/Incidents/Incidents';
import IncidentTypes from './components/Settings/IncidentTypes';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#121212',
    },
    primary: {
      main: '#00dc82',
      light: '#33e69c',
      dark: '#00b368',
    },
    secondary: {
      main: '#7000dc',
      light: '#8c33e6',
      dark: '#5a00b3',
    },
    success: {
      main: '#00dc82',
      light: '#33e69c',
      dark: '#00b368',
    },
    error: {
      main: '#dc0000',
      light: '#e63333',
      dark: '#b30000',
    },
    warning: {
      main: '#dcb000',
      light: '#e6c033',
      dark: '#b39000',
    },
    info: {
      main: '#00dcdc',
      light: '#33e6e6',
      dark: '#00b3b3',
    },
    text: {
      primary: '#ffffff',
      secondary: '#888888',
    },
    divider: 'rgba(255, 255, 255, 0.05)',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#121212',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.5px',
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          backgroundColor: '#00dc82',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#33e69c',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0, 220, 130, 0.3)',
          },
        },
        outlined: {
          borderColor: '#00dc82',
          color: '#00dc82',
          '&:hover': {
            borderColor: '#33e69c',
            backgroundColor: 'rgba(0, 220, 130, 0.08)',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          '& .MuiTableCell-head': {
            color: '#00dc82',
            fontWeight: 600,
            borderBottom: '2px solid rgba(0, 220, 130, 0.2)',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            },
          },
          '& .MuiTableCell-root': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        },
        filled: {
          '&.MuiChip-colorSuccess': {
            backgroundColor: '#00dc82',
            color: '#000000',
            '&:hover': {
              backgroundColor: '#33e69c',
            },
          },
          '&.MuiChip-colorError': {
            backgroundColor: '#dc0000',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#e63333',
            },
          },
        },
        outlined: {
          borderWidth: 2,
          '&.MuiChip-colorSuccess': {
            borderColor: '#00dc82',
            color: '#00dc82',
          },
          '&.MuiChip-colorError': {
            borderColor: '#dc0000',
            color: '#dc0000',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.2s ease-in-out',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s ease-in-out',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 220, 130, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00dc82',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#888888',
            '&.Mui-focused': {
              color: '#00dc82',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          color: '#888888',
          '&:hover': {
            color: '#00dc82',
            backgroundColor: 'rgba(0, 220, 130, 0.08)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#121212',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 16,
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <Navbar />
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8,
            ml: { xs: 0, sm: '240px' }, // Responsive margin
            width: { xs: '100%', sm: `calc(100% - 240px)` },
            height: 'calc(100vh - 64px)', // Full viewport height minus navbar
            overflow: 'auto', // Enable scrolling
            position: 'relative'
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/operators" element={<Operators />} />
            <Route path="/pads" element={<Pads />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/settings/incident-types" element={<IncidentTypes />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;

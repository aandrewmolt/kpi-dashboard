import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar,
  Divider,
  Typography,
  Box,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const drawerWidth = 240;

const mainMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Jobs', icon: <WorkIcon />, path: '/jobs' },
  { text: 'Incidents', icon: <ReportProblemIcon />, path: '/incidents' },
];

const resourcesMenuItems = [
  { text: 'Operators', icon: <PeopleIcon />, path: '/operators' },
  { text: 'Pads', icon: <BusinessIcon />, path: '/pads' },
];

const settingsMenuItems = [
  { text: 'Incident Types', icon: <CategoryIcon />, path: '/settings/incident-types' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end',
        px: [1]
      }}>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      
      {/* Main Menu */}
      <List>
        {mainMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{
                '&.active': {
                  backgroundColor: 'rgba(0, 255, 157, 0.08)',
                  '& .MuiListItemIcon-root': {
                    color: '#00ff9d',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#00ff9d',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
      
      {/* Resources Section */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="grey.500" fontWeight={600}>
          RESOURCES
        </Typography>
      </Box>
      <List>
        {resourcesMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{
                '&.active': {
                  backgroundColor: 'rgba(0, 255, 157, 0.08)',
                  '& .MuiListItemIcon-root': {
                    color: '#00ff9d',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#00ff9d',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }} />
      
      {/* Settings Section */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="grey.500" fontWeight={600}>
          SETTINGS
        </Typography>
      </Box>
      <List>
        {settingsMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{
                '&.active': {
                  backgroundColor: 'rgba(0, 255, 157, 0.08)',
                  '& .MuiListItemIcon-root': {
                    color: '#00ff9d',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#00ff9d',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            left: 16,
            top: 12,
            zIndex: (theme) => theme.zIndex.drawer + 2,
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            '& .MuiListItemButton-root': {
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(0, 255, 157, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 255, 157, 0.12)',
                },
              },
            },
            '& .MuiListItemIcon-root': {
              color: '#a0a0a0',
              minWidth: 40,
            },
            '& .MuiListItemText-primary': {
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#ffffff',
            },
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Sidebar; 
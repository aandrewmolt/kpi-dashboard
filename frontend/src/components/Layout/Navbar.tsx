import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  TextField,
  Autocomplete,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Popper,
  InputAdornment
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

interface Operator {
  id: number;
  name: string;
  role: string;
}

interface Pad {
  id: number;
  name: string;
  operator_id: number;
}

interface Job {
  id: number;
  pad_id: number;
  start_date: string;
  end_date?: string;
  status: string;
}

interface Incident {
  id: number;
  job_id: number;
  type_id: number;
  description: string;
  start_time: string;
  end_time: string;
}

interface FaultCategory {
  id: number;
  name: string;
  description: string;
}

interface SearchResult {
  id: number;
  type: 'operator' | 'pad' | 'job' | 'incident' | 'fault_category';
  title: string;
  subtitle: string;
  route: string;
}

const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const searchData = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const [operators, pads, jobs, incidents, faultCategories] = await Promise.all([
          api.get<Operator[]>('/operators'),
          api.get<Pad[]>('/pads'),
          api.get<Job[]>('/jobs'),
          api.get<Incident[]>('/incidents'),
          api.get<FaultCategory[]>('/fault-categories')
        ]);

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [
          ...operators
            .filter(op => op.name.toLowerCase().includes(query))
            .map(op => ({
              id: op.id,
              type: 'operator' as const,
              title: op.name,
              subtitle: `Operator - ${op.role}`,
              route: `/operators`
            })),
          ...pads
            .filter(pad => pad.name.toLowerCase().includes(query))
            .map(pad => ({
              id: pad.id,
              type: 'pad' as const,
              title: pad.name,
              subtitle: 'Pad',
              route: `/pads`
            })),
          ...jobs
            .filter(job => job.id.toString().includes(query))
            .map(job => ({
              id: job.id,
              type: 'job' as const,
              title: `Job ${job.id}`,
              subtitle: `Status: ${job.status}`,
              route: `/jobs`
            })),
          ...incidents
            .filter(inc => 
              inc.description.toLowerCase().includes(query) || 
              inc.id.toString().includes(query)
            )
            .map(inc => ({
              id: inc.id,
              type: 'incident' as const,
              title: `Incident ${inc.id}`,
              subtitle: inc.description,
              route: `/incidents`
            })),
          ...faultCategories
            .filter(cat => cat.name.toLowerCase().includes(query))
            .map(cat => ({
              id: cat.id,
              type: 'fault_category' as const,
              title: cat.name,
              subtitle: cat.description,
              route: '/incidents'
            }))
        ];

        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'operator':
        return <PersonIcon />;
      case 'pad':
        return <BusinessIcon />;
      case 'job':
        return <WorkIcon />;
      case 'incident':
        return <ReportProblemIcon />;
      default:
        return <SearchIcon />;
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'linear-gradient(90deg, #000000, #0a0a0a)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          sx={{ 
            marginRight: 2,
            color: '#a0a0a0',
            '&:hover': {
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            marginRight: 4,
            background: 'linear-gradient(90deg, #00ff9d, #00ffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
          }}
        >
          KPI Dashboard
        </Typography>
        
        <Box sx={{ flexGrow: 1, maxWidth: 600 }}>
          <Autocomplete
            freeSolo
            options={searchResults}
            getOptionLabel={(option) => 
              typeof option === 'string' ? option : option.title
            }
            inputValue={searchQuery}
            onInputChange={(_, value) => setSearchQuery(value)}
            onChange={(_, value) => {
              if (value && typeof value !== 'string') {
                navigate(value.route);
                setSearchQuery('');
              }
            }}
            loading={loading}
            PopperComponent={(props) => (
              <Popper {...props} sx={{ width: '100% !important' }} />
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="Search operators, pads, jobs, or incidents..."
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00ff9d',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#a0a0a0',
                    opacity: 1,
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#a0a0a0' }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box 
                component="li" 
                {...props}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03) !important',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIconForType(typeof option === 'string' ? '' : option.type)}
                  <Typography>
                    {typeof option === 'string' ? option : option.title}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 
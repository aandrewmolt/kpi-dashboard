import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Alert,
  Box,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Chip,
  Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format, isValid, isAfter, parseISO, isWithinInterval, subHours, subDays } from 'date-fns';
import { API_BASE_URL } from '../../config';
import { useSearchParams } from 'react-router-dom';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { api } from '../../utils/api';
import ClearIcon from '@mui/icons-material/Clear';

interface Incident {
  id: number;
  job_id: number;
  type_id: number;
  description: string;
  start_time: string;
  end_time: string;
  fault: string;
  job_name?: string;
  type_name?: string;
  fault_category?: string;
  operator_name?: string;
  pad_name?: string;
  created_at: string;
  updated_at?: string;
}

interface Job {
  id: number;
  pad_id: number;
  start_date: string;
  end_date?: string;
  operator_name?: string;
  pad_name?: string;
}

interface Pad {
  id: number;
  name: string;
  operator_id: number;
}

interface Operator {
  id: number;
  name: string;
}

interface IncidentType {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

interface FaultCategory {
  id: number;
  name: string;
  description: string;
}

interface FormError {
  operator_id?: string;
  pad_id?: string;
  job_id?: string;
  type_id?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  fault?: string;
}

interface FormData {
  operator_id: string;
  pad_id: string;
  job_id: string;
  type_id: string;
  description: string;
  start_time: string;
  end_time: string;
  fault: string;
}

interface FilterState {
  searchQuery: string;
  selectedOperator: string;
  selectedPad: string;
  selectedFaultCategory: string;
  jobStatus: 'all' | 'active' | 'inactive';
  timeRange: '24h' | '7d' | '30d' | '90d' | '6m' | '1y' | 'custom' | 'all';
  selectedType: string;
  startTime: string | null;
  endTime: string | null;
}

const emptyFormData: FormData = {
  operator_id: '',
  pad_id: '',
  job_id: '',
  type_id: '',
  description: '',
  start_time: '',
  end_time: '',
  fault: ''
};

const Incidents: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [faultCategories, setFaultCategories] = useState<FaultCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedOperator: 'all',
    selectedPad: 'all',
    selectedFaultCategory: 'all',
    jobStatus: 'all',
    timeRange: '24h',
    selectedType: 'all',
    startTime: null,
    endTime: null
  });
  const [filteredPads, setFilteredPads] = useState<Pad[]>([]);
  const [formFilteredPads, setFormFilteredPads] = useState<Pad[]>([]);
  const [formFilteredJobs, setFormFilteredJobs] = useState<Job[]>([]);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Add a ref to track initial load
  const initialLoadDone = useRef(false);

  const getTimeRangeParams = (range: string) => {
    const now = new Date();
    let start: Date;
    
    switch (range) {
      case '24h':
        start = subHours(now, 24);
        break;
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case '90d':
        start = subDays(now, 90);
        break;
      case '6m':
        start = subDays(now, 180);
        break;
      case '1y':
        start = subDays(now, 365);
        break;
      default:
        return { start: null, end: null };
    }
    
    return {
      start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
      end: format(now, "yyyy-MM-dd'T'HH:mm:ss")
    };
  };

  // Modify the first useEffect to only run once on initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      const operator = searchParams.get('operator');
      const pad = searchParams.get('pad');
      const faultCategory = searchParams.get('fault_category');
      const type = searchParams.get('type');
      const timeRange = searchParams.get('time_range') as FilterState['timeRange'];
      const jobStatus = searchParams.get('job_status') as FilterState['jobStatus'];
      
      if (timeRange || operator || pad || faultCategory || type || jobStatus) {
        setFilters(prev => ({
          ...prev,
          selectedOperator: operator || prev.selectedOperator,
          selectedPad: pad || prev.selectedPad,
          selectedFaultCategory: faultCategory || prev.selectedFaultCategory,
          selectedType: type || prev.selectedType,
          timeRange: timeRange || prev.timeRange,
          jobStatus: jobStatus || prev.jobStatus,
          startTime: timeRange ? getTimeRangeParams(timeRange).start : prev.startTime,
          endTime: timeRange ? getTimeRangeParams(timeRange).end : prev.endTime
        }));
      }
      initialLoadDone.current = true;
    }
  }, [searchParams]);

  // Modify the second useEffect to only update URL if filters change after initial load
  useEffect(() => {
    if (initialLoadDone.current) {
      const params = new URLSearchParams(searchParams);
      let hasChanges = false;

      const updateParam = (key: string, value: string | null) => {
        const currentValue = params.get(key);
        if (value && value !== 'all' && value !== currentValue) {
          params.set(key, value);
          hasChanges = true;
        } else if (!value || value === 'all') {
          if (currentValue !== null) {
            params.delete(key);
            hasChanges = true;
          }
        }
      };

      updateParam('operator', filters.selectedOperator);
      updateParam('pad', filters.selectedPad);
      updateParam('fault_category', filters.selectedFaultCategory);
      updateParam('type', filters.selectedType);
      updateParam('job_status', filters.jobStatus);
      updateParam('time_range', filters.timeRange === 'custom' ? null : filters.timeRange);
      
      if (filters.timeRange === 'custom') {
        updateParam('start_time', filters.startTime);
        updateParam('end_time', filters.endTime);
      }

      if (hasChanges) {
        setSearchParams(params, { replace: true });
      }
    }
  }, [filters, searchParams, setSearchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incidentsData, jobsData, padsData, typesData, operatorsData, faultCategoriesData] = await Promise.all([
        api.get<Incident[]>('/incidents'),
        api.get<Job[]>('/jobs'),
        api.get<Pad[]>('/pads'),
        api.get<IncidentType[]>('/incident-types'),
        api.get<Operator[]>('/operators'),
        api.get<FaultCategory[]>('/fault-categories')
      ]);

      // Enrich incidents with related data
      const enrichedIncidents = incidentsData.map((incident: Incident) => {
        const job = jobsData.find((j: Job) => j.id === incident.job_id) || null;
        const incidentType = typesData.find((t: IncidentType) => t.id === incident.type_id) || null;
        const pad = job ? padsData.find((p: Pad) => p.id === job.pad_id) : null;
        const operator = pad ? operatorsData.find((o: Operator) => o.id === pad.operator_id) : null;

        return {
          ...incident,
          job_name: job && operator ? `${operator.name} - ${pad?.name}` : 'Unknown Job',
          type_name: incidentType?.name || 'Unknown Type',
          fault_category: incident.fault || 'Unknown',
          operator_name: operator?.name || 'Unknown Operator',
          pad_name: pad?.name || 'Unknown Pad'
        };
      });

      setIncidents(enrichedIncidents);
      setJobs(jobsData);
      setPads(padsData);
      setOperators(operatorsData);
      setIncidentTypes(typesData);
      setFaultCategories(faultCategoriesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (filters.selectedOperator === 'all') {
      setFilteredPads(pads);
    } else {
      const selectedOperatorObj = operators.find(op => op.name === filters.selectedOperator);
      if (selectedOperatorObj) {
        const operatorPads = pads.filter(pad => {
          const job = jobs.find(j => j.pad_id === pad.id);
          return job && job.operator_name === filters.selectedOperator;
        });
        setFilteredPads(operatorPads);
      } else {
        setFilteredPads([]);
      }
    }
    if (filters.selectedPad !== 'all') {
      setFilters(prev => ({ ...prev, selectedPad: 'all' }));
    }
  }, [filters.selectedOperator, pads, jobs, operators]);

  useEffect(() => {
    if (formData.operator_id) {
      const operatorPads = pads.filter(pad => pad.operator_id === parseInt(formData.operator_id));
      setFormFilteredPads(operatorPads);
    } else {
      setFormFilteredPads([]);
    }
  }, [formData.operator_id, pads]);

  useEffect(() => {
    if (formData.pad_id) {
      const padJobs = jobs.filter(job => job.pad_id === parseInt(formData.pad_id));
      setFormFilteredJobs(padJobs);
    } else {
      setFormFilteredJobs([]);
    }
  }, [formData.pad_id, jobs]);

  const getFilteredIncidents = useCallback(() => {
    return incidents.filter(incident => {
      // Time Range filter
      if (filters.startTime && filters.endTime) {
        const incidentStart = parseISO(incident.start_time);
        const incidentEnd = incident.end_time ? parseISO(incident.end_time) : new Date();
        const filterStart = parseISO(filters.startTime);
        const filterEnd = parseISO(filters.endTime);
        
        const hasOverlap = (
          incidentStart <= filterEnd && incidentEnd >= filterStart
        );
        
        if (!hasOverlap) return false;
      }

      // Search filter
      if (filters.searchQuery.trim()) {
        const searchTerms = filters.searchQuery.toLowerCase().split(' ');
        const searchableText = [
          incident.description,
          incident.job_name,
          incident.type_name,
          incident.operator_name,
          incident.pad_name,
          incident.fault,
          `#${incident.id}`
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchTerms.every(term => searchableText.includes(term))) {
          return false;
        }
      }

      // Operator filter
      if (filters.selectedOperator !== 'all' && incident.operator_name !== filters.selectedOperator) {
        return false;
      }

      // Pad filter
      if (filters.selectedPad !== 'all' && incident.pad_name !== filters.selectedPad) {
        return false;
      }

      // Fault Category filter
      if (filters.selectedFaultCategory !== 'all' && incident.fault !== filters.selectedFaultCategory) {
        return false;
      }

      // Type filter
      if (filters.selectedType !== 'all' && incident.type_id.toString() !== filters.selectedType) {
        return false;
      }

      // Job Status filter
      if (filters.jobStatus !== 'all') {
        const job = jobs.find(j => j.id === incident.job_id);
        if (!job) return false;
        const isActive = !job.end_date;
        if (filters.jobStatus === 'active' && !isActive) return false;
        if (filters.jobStatus === 'inactive' && isActive) return false;
      }

      return true;
    });
  }, [incidents, filters, jobs]);

  const filteredIncidents = useMemo(() => getFilteredIncidents(), [getFilteredIncidents]);

  // Memoize filtered pads based on selected operator
  const memoizedFilteredPads = useMemo(() => {
    if (filters.selectedOperator === 'all') {
      return pads;
    }
    
    const selectedOperatorObj = operators.find(op => op.name === filters.selectedOperator);
    if (!selectedOperatorObj) {
      return [];
    }

    return pads.filter(pad => {
      const job = jobs.find(j => j.pad_id === pad.id);
      return job && job.operator_name === filters.selectedOperator;
    });
  }, [filters.selectedOperator, pads, jobs, operators]);

  // Memoize form filtered pads
  const formFilteredPadsData = useMemo(() => {
    if (!formData.operator_id) {
      return [];
    }
    return pads.filter(pad => pad.operator_id === parseInt(formData.operator_id));
  }, [formData.operator_id, pads]);

  // Memoize form filtered jobs
  const formFilteredJobsData = useMemo(() => {
    if (!formData.pad_id) {
      return [];
    }
    return jobs.filter(job => job.pad_id === parseInt(formData.pad_id));
  }, [formData.pad_id, jobs]);

  // Update the useEffect that was setting these values to use the memoized values
  useEffect(() => {
    setFilteredPads(memoizedFilteredPads);
  }, [memoizedFilteredPads]);

  useEffect(() => {
    setFormFilteredPads(formFilteredPadsData);
  }, [formFilteredPadsData]);

  useEffect(() => {
    setFormFilteredJobs(formFilteredJobsData);
  }, [formFilteredJobsData]);

  // Memoize form handlers
  const handleFormChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'operator_id') {
        newData.pad_id = '';
        newData.job_id = '';
      } else if (field === 'pad_id') {
        newData.job_id = '';
      }
      
      return newData;
    });
  }, []);

  const handleOpenDialog = async (incident?: Incident) => {
    if (incident) {
      try {
        const job = jobs.find(j => j.id === incident.job_id);
        const pad = job ? pads.find(p => p.id === job.pad_id) : null;
        const operator = pad ? operators.find(o => o.id === pad.operator_id) : null;

        if (!job || !pad || !operator) {
          console.error('Missing required relationships:', { job, pad, operator });
          throw new Error('Could not find all required relationships');
        }

        setEditingIncidentId(incident.id);
        setEditingIncident(incident);

        const filteredPads = pads.filter(p => p.operator_id === operator.id);
        const filteredJobs = jobs.filter(j => j.pad_id === pad.id);
        
        setFormFilteredPads(filteredPads);
        setFormFilteredJobs(filteredJobs);

        setFormData({
          operator_id: operator?.id?.toString() || '',
          pad_id: pad?.id?.toString() || '',
          job_id: incident?.job_id?.toString() || '',
          type_id: incident?.type_id?.toString() || '',
          description: incident?.description || '',
          start_time: incident?.start_time ? format(new Date(incident.start_time), "yyyy-MM-dd'T'HH:mm") : '',
          end_time: incident?.end_time ? format(new Date(incident.end_time), "yyyy-MM-dd'T'HH:mm") : '',
          fault: incident?.fault || ''
        });

      } catch (error) {
        console.error('Error setting up edit form:', error);
        setError('Failed to load incident details for editing');
        return;
      }
    } else {
      setEditingIncidentId(null);
      setEditingIncident(null);
      setFormData(emptyFormData);
      setFormFilteredJobs([]);
      setFormFilteredPads([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setFormData(emptyFormData);
    setEditingIncident(null);
    setEditingIncidentId(null);
    setFormErrors({});
    setError(null);
  }, []);

  const validateForm = useCallback((data: FormData): FormError => {
    const errors: FormError = {};

    // Operator validation
    if (!data.operator_id) {
      errors.operator_id = 'Operator is required';
    }

    // Pad validation
    if (!data.pad_id) {
      errors.pad_id = 'Pad is required';
    }

    // Job ID validation
    if (!data.job_id) {
      errors.job_id = 'Job is required';
    }

    // Type ID validation
    if (!data.type_id) {
      errors.type_id = 'Incident type is required';
    }

    // Description validation
    if (!data.description) {
      errors.description = 'Description is required';
    } else if (data.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    // Start time validation
    if (!data.start_time) {
      errors.start_time = 'Start time is required';
    } else {
      try {
        const startDate = parseISO(data.start_time);
        if (!isValid(startDate)) {
          errors.start_time = 'Invalid start time';
        }
      } catch {
        errors.start_time = 'Invalid start time format';
      }
    }

    // End time validation
    if (!data.end_time) {
      errors.end_time = 'End time is required';
    } else {
      try {
        const endDate = parseISO(data.end_time);
        if (!isValid(endDate)) {
          errors.end_time = 'Invalid end time';
        } else if (data.start_time) {
          const startDate = parseISO(data.start_time);
          if (isValid(startDate) && isAfter(startDate, endDate)) {
            errors.end_time = 'End time must be after start time';
          }
        }
      } catch {
        errors.end_time = 'Invalid end time format';
      }
    }

    // Fault validation
    if (!data.fault) {
      errors.fault = 'Fault category is required';
    }

    return errors;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const endpoint = editingIncident
        ? `${API_BASE_URL}/incidents/${editingIncident.id}`
        : `${API_BASE_URL}/incidents`;

      const response = await fetch(endpoint, {
        method: editingIncident ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: parseInt(formData.job_id),
          type_id: parseInt(formData.type_id),
          description: formData.description.trim(),
          start_time: formData.start_time,
          end_time: formData.end_time,
          fault: formData.fault
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save incident');
      }

      await fetchData();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving incident:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the incident');
    } finally {
      setLoading(false);
    }
  }, [formData, editingIncident, fetchData]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this incident?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/incidents/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to delete incident');
      }

      await fetchData();
    } catch (err) {
      console.error('Error deleting incident:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the incident');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const getTypeName = (typeId: number) => {
    const type = incidentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  // Update the useEffect for time range changes
  useEffect(() => {
    if (filters.timeRange !== 'custom' && filters.timeRange !== 'all') {
      const { start, end } = getTimeRangeParams(filters.timeRange);
      if (start && end) {
        setFilters(prev => ({
          ...prev,
          startTime: start,
          endTime: end
        }));
      }
    }
  }, [filters.timeRange]);

  // Add debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchQuery: debouncedSearchTerm }));
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearchTerm]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>Incidents</Typography>
          <Typography variant="body1" color="text.secondary">
            {filteredIncidents.length} incidents found
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Add Incident
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search incidents..."
              value={debouncedSearchTerm}
              onChange={(e) => setDebouncedSearchTerm(e.target.value)}
              placeholder="Search by description, job, type, operator, pad, or incident ID..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: debouncedSearchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setDebouncedSearchTerm('')}
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Autocomplete
              size="small"
              options={['all', ...operators.map(op => op.name)]}
              value={filters.selectedOperator}
              onChange={(event, newValue) => setFilters(prev => ({ ...prev, selectedOperator: newValue || 'all' }))}
              freeSolo
              autoSelect
              handleHomeEndKeys
              selectOnFocus
              clearOnBlur={false}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Operator"
                  placeholder="Type or select operator"
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.2)',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      }
                    }
                  }}
                />
              )}
              getOptionLabel={(option) => option === 'all' ? 'Show All Operators' : option}
              filterOptions={(options, params) => {
                const filtered = options.filter(option => 
                  option.toLowerCase().includes(params.inputValue.toLowerCase())
                );
                return filtered;
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Autocomplete
              size="small"
              options={['all', ...filteredPads.map(pad => pad.name)]}
              value={filters.selectedPad}
              onChange={(event, newValue) => setFilters(prev => ({ ...prev, selectedPad: newValue || 'all' }))}
              freeSolo
              autoSelect
              handleHomeEndKeys
              selectOnFocus
              clearOnBlur={false}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Pad"
                  placeholder="Type or select pad"
                  sx={{
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)'
                    },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.2)',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      }
                    }
                  }}
                />
              )}
              getOptionLabel={(option) => option === 'all' ? 'Show All Pads' : option}
              filterOptions={(options, params) => {
                const filtered = options.filter(option => 
                  option.toLowerCase().includes(params.inputValue.toLowerCase())
                );
                return filtered;
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Filter by Job Status"
              value={filters.jobStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, jobStatus: e.target.value as FilterState['jobStatus'] }))}
              sx={{
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            >
              <MenuItem value="all">Show All Jobs</MenuItem>
              <MenuItem value="active">Active Jobs Only</MenuItem>
              <MenuItem value="inactive">Completed Jobs Only</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Filter by Time Range"
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as FilterState['timeRange'] }))}
              sx={{
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            >
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="6m">Last 6 Months</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Filter by Incident Type"
              value={filters.selectedType}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedType: e.target.value }))}
              sx={{
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)'
                }
              }}
            >
              <MenuItem value="all">Show All Incident Types</MenuItem>
              {incidentTypes.map((type) => type?.id ? (
                <MenuItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </MenuItem>
              ) : null)}
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper} sx={{ 
        mt: 2, 
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        '& .MuiTableCell-root': {
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }
      }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '5%' }}>ID</TableCell>
              <TableCell sx={{ width: '15%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2">Job</Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ width: '10%' }}>Type</TableCell>
              <TableCell sx={{ width: '25%' }}>Description</TableCell>
              <TableCell sx={{ width: '12%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2">Start Time</Typography>
                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ width: '12%' }}>End Time</TableCell>
              <TableCell sx={{ width: '8%' }}>Fault</TableCell>
              <TableCell sx={{ width: '8%' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIncidents.map((incident) => {
              const startTime = new Date(incident.start_time);
              const endTime = incident.end_time ? new Date(incident.end_time) : new Date();
              const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
              
              return (
                <TableRow key={incident.id} hover>
                  <TableCell>{incident.id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2">{incident.job_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {incident.type_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {incident.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2">
                        {format(startTime, 'MMM d, HH:mm')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {duration}h
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {incident.end_time ? format(new Date(incident.end_time), 'MMM d, HH:mm') : 'In Progress'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={incident.fault}
                      color={
                        incident.fault === 'Frac' ? 'warning' :
                        incident.fault === 'ShearFrac' ? 'info' : 
                        'error'
                      }
                      size="small"
                      sx={{ minWidth: '80px' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <IconButton 
                        onClick={() => handleOpenDialog(incident)} 
                        size="small"
                        sx={{ 
                          color: 'primary.main',
                          '&:hover': { backgroundColor: 'rgba(144, 202, 249, 0.08)' }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleDelete(incident.id)} 
                        size="small"
                        sx={{ 
                          color: 'error.main',
                          '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.08)' }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIncident ? 'Edit Incident' : 'Add New Incident'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Operator"
                  value={formData.operator_id}
                  onChange={(e) => handleFormChange('operator_id', e.target.value)}
                  error={!!formErrors.operator_id}
                  helperText={formErrors.operator_id}
                  required
                >
                  <MenuItem value="" disabled>
                    Select Operator
                  </MenuItem>
                  {operators
                    .filter(operator => operator && operator.id != null)
                    .map((operator) => (
                      <MenuItem key={operator.id} value={operator.id.toString()}>
                        {operator.name || 'Unknown Operator'}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Pad"
                  value={formData.pad_id}
                  onChange={(e) => handleFormChange('pad_id', e.target.value)}
                  error={!!formErrors.pad_id}
                  helperText={formErrors.pad_id}
                  required
                  disabled={!formData.operator_id}
                >
                  <MenuItem value="" disabled>
                    Select Pad
                  </MenuItem>
                  {formFilteredPads.map((pad) => (
                    <MenuItem key={pad.id} value={pad.id.toString()}>
                      {pad.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Job"
                  value={formData.job_id}
                  onChange={(e) => handleFormChange('job_id', e.target.value)}
                  error={!!formErrors.job_id}
                  helperText={formErrors.job_id}
                  required
                  disabled={!formData.pad_id}
                >
                  <MenuItem value="" disabled>
                    Select Job
                  </MenuItem>
                  {formFilteredJobs.map((job) => {
                    const jobPad = pads.find(p => p.id === job.pad_id);
                    const jobOperator = operators.find(o => o.id === jobPad?.operator_id);
                    return (
                      <MenuItem key={job.id} value={job.id.toString()}>
                        {jobOperator?.name} - {jobPad?.name}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Incident Type"
                  value={formData.type_id}
                  onChange={(e) => handleFormChange('type_id', e.target.value)}
                  error={!!formErrors.type_id}
                  helperText={formErrors.type_id}
                  required
                >
                  {incidentTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                  required
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Start Time"
                  value={formData.start_time}
                  onChange={(e) => handleFormChange('start_time', e.target.value)}
                  error={!!formErrors.start_time}
                  helperText={formErrors.start_time}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="End Time"
                  value={formData.end_time}
                  onChange={(e) => handleFormChange('end_time', e.target.value)}
                  error={!!formErrors.end_time}
                  helperText={formErrors.end_time}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Fault Category"
                  value={formData.fault}
                  onChange={(e) => handleFormChange('fault', e.target.value)}
                  error={!!formErrors.fault}
                  helperText={formErrors.fault}
                  required
                >
                  {faultCategories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Incidents; 

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Typography, 
  Paper,
  CircularProgress,
  Alert,
  Box,
  Chip,
  Grid,
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
  TextField,
  MenuItem
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format, differenceInHours, parseISO } from 'date-fns';
import { API_BASE_URL } from '../../config';
import JobDetailsModal from './JobDetailsModal';
import CreateIncidentModal from './CreateIncidentModal';
import CompleteJobModal from './CompleteJobModal';
import CreateJobModal from './CreateJobModal';
import { api } from '../../utils/api';
import { useSearchParams } from 'react-router-dom';

interface Job {
  id: number;
  pad_id: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed';
  incidents: number[];
  pad_name: string;
  operator_name: string;
  location?: string;
}

interface Incident {
  id: number;
  job_id: number;
  type_id: number;
  type_name?: string;
  description: string;
  start_time: string;
  end_time: string;
  fault: string;
  job_name?: string;
  fault_category?: string;
  operator_name?: string;
  pad_name?: string;
}

interface JobMetrics {
  totalHours: number;
  uptime: number;
  uptimePercentage: number;
  faultHours: {
    Frac: number;
    ShearFrac: number;
    Other: number;
  };
  faultPercentages: {
    Frac: number;
    ShearFrac: number;
    Other: number;
  };
}

const calculateJobMetrics = (job: Job, incidents: Incident[]): JobMetrics => {
  const start = parseISO(job.start_date);
  const end = job.end_date ? parseISO(job.end_date) : new Date();
  const totalHours = differenceInHours(end, start);

  const jobIncidents = incidents.filter(i => i.job_id === job.id);
  
  const faultHours = {
    Frac: 0,
    ShearFrac: 0,
    Other: 0
  };

  jobIncidents.forEach(incident => {
    if (!incident.end_time || !incident.start_time) return;
    const incidentHours = differenceInHours(parseISO(incident.end_time), parseISO(incident.start_time));
    switch (incident.fault) {
      case 'Frac':
        faultHours.Frac += incidentHours;
        break;
      case 'ShearFrac':
        faultHours.ShearFrac += incidentHours;
        break;
      default:
        faultHours.Other += incidentHours;
    }
  });

  const totalDowntime = faultHours.Frac + faultHours.ShearFrac + faultHours.Other;
  const uptime = Math.max(0, totalHours - totalDowntime);
  const uptimePercentage = totalHours > 0 ? (uptime / totalHours) * 100 : 0;

  return {
    totalHours,
    uptime,
    uptimePercentage,
    faultHours,
    faultPercentages: {
      Frac: totalHours > 0 ? (faultHours.Frac / totalHours) * 100 : 0,
      ShearFrac: totalHours > 0 ? (faultHours.ShearFrac / totalHours) * 100 : 0,
      Other: totalHours > 0 ? (faultHours.Other / totalHours) * 100 : 0
    }
  };
};

interface JobCardProps {
  job: Job;
  metrics: JobMetrics;
  incidents: Incident[];
}

const JobCard: React.FC<JobCardProps> = ({ job, metrics, incidents }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  // Format the title with truncation
  const title = `${job.pad_name} - ${job.operator_name}`;
  const truncatedTitle = truncateText(title, 40);

  const handleJobCompleted = () => {
    window.location.reload();
  };

  // Calculate recent incidents
  const recentIncidents = incidents
    .filter(i => i.job_id === job.id)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 2);

  return (
    <>
      <Paper 
        sx={{ 
          p: 3,
          pb: 5,
          bgcolor: '#1e1e1e', 
          color: 'white',
          borderRadius: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: '380px', sm: '360px' },
          maxHeight: { xs: '380px', sm: '360px' },
          overflow: 'hidden',
          position: 'relative',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[10],
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 1.5,
          minHeight: '24px',
        }}>
          <Box sx={{ 
            flex: 1, 
            mr: 1,
            overflow: 'hidden',
          }}>
            <Typography 
              variant="h6"
              sx={{ 
                fontWeight: 600,
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                letterSpacing: '0.01em',
                fontSize: '1rem',
              }}
              title={title}
            >
              {truncatedTitle}
            </Typography>
          </Box>
          <Chip 
            label={job.status === 'active' ? 'Active' : 'Completed'} 
            color={job.status === 'active' ? 'success' : 'default'}
            size="small"
            sx={{ 
              flexShrink: 0,
              height: '20px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              fontSize: '0.7rem',
            }}
          />
        </Box>

        <Grid container spacing={1.5} sx={{ mb: 1, flex: '0 0 auto' }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="grey.400" sx={{ fontWeight: 500, mb: 0.25, display: 'block' }}>Start</Typography>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'grey.100',
                  fontSize: {
                    xs: '0.65rem',
                    sm: '0.7rem',
                    md: '0.75rem'
                  }
                }}
              >
                {format(parseISO(job.start_date), 'MMM d, yyyy')}
              </Typography>
              <Typography 
                component="span" 
                variant="caption" 
                color="grey.500"
                sx={{ 
                  fontSize: {
                    xs: '0.6rem',
                    sm: '0.65rem',
                    md: '0.7rem'
                  }
                }}
              >
                {format(parseISO(job.start_date), 'h:mm a')}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="grey.400" sx={{ fontWeight: 500, mb: 0.25, display: 'block' }}>End</Typography>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}>
              {job.end_date ? (
                <>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'grey.100',
                      fontSize: {
                        xs: '0.65rem',
                        sm: '0.7rem',
                        md: '0.75rem'
                      }
                    }}
                  >
                    {format(parseISO(job.end_date), 'MMM d, yyyy')}
                  </Typography>
                  <Typography 
                    component="span" 
                    variant="caption" 
                    color="grey.500"
                    sx={{ 
                      fontSize: {
                        xs: '0.6rem',
                        sm: '0.65rem',
                        md: '0.7rem'
                      }
                    }}
                  >
                    {format(parseISO(job.end_date), 'h:mm a')}
                  </Typography>
                </>
              ) : (
                <Typography 
                  component="span" 
                  sx={{ 
                    color: 'success.main', 
                    fontWeight: 500,
                    fontSize: {
                      xs: '0.65rem',
                      sm: '0.7rem',
                      md: '0.75rem'
                    }
                  }}
                >
                  In Progress
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mb: 1.5, flex: '0 0 auto' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mb: 0.75,
            alignItems: 'center'
          }}>
            <Typography variant="caption" color="grey.400" sx={{ fontWeight: 500 }}>
              {metrics.totalHours.toFixed(1)}h Total
            </Typography>
            <Typography 
              variant="caption"
              sx={{ 
                color: metrics.uptimePercentage >= 95 ? 'success.main' : 
                       metrics.uptimePercentage >= 85 ? 'warning.main' : 'error.main',
                fontWeight: 600
              }}
            >
              {metrics.uptimePercentage.toFixed(1)}% Uptime
            </Typography>
          </Box>
          <Box sx={{ 
            height: 6, 
            borderRadius: 3,
            overflow: 'hidden', 
            display: 'flex', 
            bgcolor: 'rgba(255, 255, 255, 0.05)',
          }}>
            <Box sx={{ 
              width: `${metrics.uptimePercentage}%`, 
              bgcolor: 'success.main', 
              height: '100%',
              boxShadow: 'inset 0 1px 2px rgba(76, 175, 80, 0.3)'
            }} />
            <Box sx={{ 
              width: `${metrics.faultPercentages.Frac}%`, 
              bgcolor: 'warning.main', 
              height: '100%',
              boxShadow: 'inset 0 1px 2px rgba(255, 152, 0, 0.3)'
            }} />
            <Box sx={{ 
              width: `${metrics.faultPercentages.ShearFrac}%`, 
              bgcolor: 'info.main', 
              height: '100%',
              boxShadow: 'inset 0 1px 2px rgba(33, 150, 243, 0.3)'
            }} />
            <Box sx={{ 
              width: `${metrics.faultPercentages.Other}%`, 
              bgcolor: 'error.main', 
              height: '100%',
              boxShadow: 'inset 0 1px 2px rgba(244, 67, 54, 0.3)'
            }} />
          </Box>
        </Box>

        <Grid container spacing={1} sx={{ 
          mb: 3.5,
          flex: 1,
          overflow: 'visible'
        }}>
          {[
            { label: 'Uptime', hours: metrics.uptime, percent: metrics.uptimePercentage, color: 'success' },
            { label: 'Frac', hours: metrics.faultHours.Frac, percent: metrics.faultPercentages.Frac, color: 'warning' },
            { label: 'ShearFrac', hours: metrics.faultHours.ShearFrac, percent: metrics.faultPercentages.ShearFrac, color: 'info' },
            { label: 'Other', hours: metrics.faultHours.Other, percent: metrics.faultPercentages.Other, color: 'error' }
          ].map((metric) => (
            <Grid item xs={6} key={metric.label}>
              <Box sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.03)', 
                p: { 
                  xs: 0.5,
                  sm: 0.75,
                  md: 1 
                },
                borderRadius: 1,
                textAlign: 'left',
                minWidth: 0,
                height: '100%',
                transition: 'background-color 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                }
              }}>
                <Typography 
                  variant="caption"
                  color={`${metric.color}.main`}
                  sx={{
                    display: 'block',
                    whiteSpace: 'normal',
                    fontSize: {
                      xs: '0.6rem',
                      sm: '0.65rem',
                      md: '0.7rem'
                    },
                    fontWeight: 600,
                    maxWidth: '100%',
                    letterSpacing: '0.02em',
                    lineHeight: 1.1,
                    mb: { xs: 0.25, sm: 0.5 }
                  }}
                >
                  {metric.label}
                </Typography>
                <Stack 
                  direction="column" 
                  spacing={0.25}
                  sx={{ 
                    minHeight: { xs: '25px', sm: '30px' }
                  }}
                >
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontWeight: 'medium',
                      lineHeight: 1.1,
                      fontSize: {
                        xs: '0.7rem',
                        sm: '0.75rem',
                        md: '0.8rem'
                      }
                    }}
                  >
                    {metric.hours.toFixed(1)}h
                  </Typography>
                  <Typography 
                    variant="caption"
                    color="grey.500"
                    sx={{
                      fontSize: {
                        xs: '0.6rem',
                        sm: '0.65rem',
                        md: '0.7rem'
                      }
                    }}
                  >
                    {metric.percent.toFixed(1)}%
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ 
          position: 'absolute',
          bottom: 12,
          right: 24,
          display: 'flex', 
          gap: 0.75, 
          justifyContent: 'flex-end',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          pt: 1.5,
          mt: 1.5,
          backgroundColor: '#1e1e1e'
        }}>
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDetailsModalOpen(true);
            }}
            sx={{ 
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.2)',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                color: 'rgba(255, 255, 255, 0.3)',
              }
            }}
            title="View Details"
          >
            <VisibilityIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIncidentModalOpen(true);
            }}
            disabled={job.status === 'completed'}
            sx={{ 
              bgcolor: 'rgba(211, 47, 47, 0.1)',
              color: 'error.main',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.2)',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                color: 'rgba(255, 255, 255, 0.3)',
              }
            }}
            title="Report Incident"
          >
            <WarningIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setCompleteModalOpen(true);
            }}
            disabled={job.status === 'completed'}
            sx={{ 
              bgcolor: 'rgba(156, 39, 176, 0.1)',
              color: 'secondary.main',
              '&:hover': {
                bgcolor: 'rgba(156, 39, 176, 0.2)',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                color: 'rgba(255, 255, 255, 0.3)',
              }
            }}
            title="Mark as Completed"
          >
            <CheckCircleIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Box>
      </Paper>

      <JobDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        job={job}
        metrics={metrics}
        incidents={incidents}
      />

      <CreateIncidentModal
        open={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        jobId={job.id}
      />

      <CompleteJobModal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        job={job}
        onJobCompleted={handleJobCompleted}
      />
    </>
  );
};

interface FormData {
  operator_id: string;
  pad_id: string;
  start_date: string;
  end_date?: string;
}

interface FormError {
  operator_id?: string;
  pad_id?: string;
  start_date?: string;
  end_date?: string;
}

const Jobs: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [operators, setOperators] = useState<string[]>([]);
  const [pads, setPads] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    operator: 'all',
    pad: 'all',
    timeRange: '24h'
  });
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<FormData>({
    operator_id: '',
    pad_id: '',
    start_date: '',
    end_date: ''
  });
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLoadDone = useRef(false);

  // Initialize filters from URL parameters
  useEffect(() => {
    if (!initialLoadDone.current) {
      const status = searchParams.get('status');
      const operator = searchParams.get('operator');
      const pad = searchParams.get('pad');
      const timeRange = searchParams.get('time_range');

      if (status || operator || pad || timeRange) {
        setFilters(prev => ({
          ...prev,
          status: status || prev.status,
          operator: operator || prev.operator,
          pad: pad || prev.pad,
          timeRange: timeRange || prev.timeRange
        }));
      }
      initialLoadDone.current = true;
    }
  }, [searchParams]);

  // Update URL when filters change
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

      updateParam('status', filters.status);
      updateParam('operator', filters.operator);
      updateParam('pad', filters.pad);
      updateParam('time_range', filters.timeRange);

      if (hasChanges) {
        setSearchParams(params, { replace: true });
      }
    }
  }, [filters, searchParams, setSearchParams]);

  // Type guard for Job data
  const isValidJob = (job: any): job is Job => {
    try {
      // Basic field validation
      if (!job || 
          typeof job.id !== 'number' ||
          typeof job.pad_id !== 'number' ||
          typeof job.start_date !== 'string' ||
          !job.start_date ||
          (job.end_date !== null && (typeof job.end_date !== 'string' || !job.end_date))) {
        console.log('Failed basic validation for job:', job);
        return false;
      }

      // Validate arrays and strings
      if (!Array.isArray(job.incidents) ||
          typeof job.pad_name !== 'string' ||
          typeof job.operator_name !== 'string') {
        console.log('Failed array/string validation for job:', job);
        return false;
      }

      // Validate status
      if (job.status !== 'active' && job.status !== 'completed') {
        console.log('Failed status validation for job:', job);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating job:', error);
      return false;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsData, incidentsData] = await Promise.all([
        api.get<Job[]>('/jobs'),
        api.get<Incident[]>('/incidents')
      ]);

      console.log('Raw jobs data:', jobsData);
      const validJobs = jobsData.filter((job: any) => {
        const isValid = isValidJob(job);
        if (!isValid) {
          console.log('Failed validation for job:', job);
          console.log('Validation checks:', {
            hasId: typeof job.id === 'number',
            hasPadId: typeof job.pad_id === 'number',
            hasStartDate: typeof job.start_date === 'string',
            hasStatus: typeof job.status === 'string',
            validStatus: job.status === 'active' || job.status === 'completed',
            hasOperatorName: typeof job.operator_name === 'string',
            hasPadName: typeof job.pad_name === 'string',
            hasIncidents: Array.isArray(job.incidents)
          });
        }
        return isValid;
      });
      console.log('Valid jobs:', validJobs);
      
      // Extract unique operators and pads from valid jobs
      const uniqueOperators = Array.from(new Set(validJobs.map((job: Job) => job.operator_name))) as string[];
      const uniquePads = Array.from(new Set(validJobs.map((job: Job) => job.pad_name))) as string[];
      
      setOperators(uniqueOperators);
      setPads(uniquePads);
      setJobs(validJobs);
      setIncidents(incidentsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters.status, filters.operator, filters.pad]);

  // Calculate active and completed counts from the unfiltered jobs array
  const activeCount = jobs.filter(job => job.status === 'active').length;
  const completedCount = jobs.filter(job => job.status === 'completed').length;

  console.log('Current filters:', filters);
  console.log('Active count:', activeCount);
  console.log('Completed count:', completedCount);

  // Updated filtering and sorting logic
  const filteredJobs = jobs
    .filter(job => {
      const statusMatch = filters.status === 'all' || job.status === filters.status;
      const operatorMatch = filters.operator === 'all' || job.operator_name === filters.operator;
      const padMatch = filters.pad === 'all' || job.pad_name === filters.pad;

      return statusMatch && operatorMatch && padMatch;
    })
    .sort((a, b) => {
      // First sort by active status
      if (a.status === 'active' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'active') return 1;
      
      // Then sort alphabetically by pad name
      return a.pad_name.localeCompare(b.pad_name);
    });

  // Sort operators with active jobs first, then alphabetically
  const sortedOperators = useMemo(() => {
    const operatorsWithStatus = operators.map(operator => ({
      name: operator,
      hasActiveJob: jobs.some(job => job.operator_name === operator && job.status === 'active')
    }));

    return operatorsWithStatus
      .sort((a, b) => {
        // First sort by active status
        if (a.hasActiveJob && !b.hasActiveJob) return -1;
        if (!a.hasActiveJob && b.hasActiveJob) return 1;
        
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      })
      .map(op => op.name);
  }, [operators, jobs]);

  // Sort pads with active jobs first, then alphabetically
  const filteredPads = useMemo(() => {
    let availablePads = filters.operator === 'all' 
      ? pads 
      : pads.filter(pad => jobs.some(job => job.pad_name === pad && job.operator_name === filters.operator));

    const padsWithStatus = availablePads.map(pad => ({
      name: pad,
      hasActiveJob: jobs.some(job => job.pad_name === pad && job.status === 'active')
    }));

    return padsWithStatus
      .sort((a, b) => {
        // First sort by active status
        if (a.hasActiveJob && !b.hasActiveJob) return -1;
        if (!a.hasActiveJob && b.hasActiveJob) return 1;
        
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      })
      .map(pad => pad.name);
  }, [pads, jobs, filters.operator]);

  const validateForm = (data: FormData): FormError => {
    const errors: FormError = {};

    if (!data.operator_id) {
      errors.operator_id = 'Operator is required';
    }

    if (!data.pad_id) {
      errors.pad_id = 'Pad is required';
    }

    if (!data.start_date) {
      errors.start_date = 'Start date is required';
    }

    // Check for overlapping jobs on the same pad
    if (data.pad_id && data.start_date) {
      const padJobs = jobs.filter(job => 
        job.pad_id === parseInt(data.pad_id) && 
        (!editingJob || job.id !== editingJob.id)
      );

      const newJobStart = parseISO(data.start_date);
      const newJobEnd = data.end_date ? parseISO(data.end_date) : null;

      const hasOverlap = padJobs.some(job => {
        const jobStart = parseISO(job.start_date);
        const jobEnd = job.end_date ? parseISO(job.end_date) : null;

        // If either job has no end date, they are active and would overlap
        if (!jobEnd || !newJobEnd) {
          return true;
        }

        // Check if date ranges overlap
        return (
          (newJobStart <= jobEnd && newJobEnd >= jobStart) ||
          (jobStart <= newJobEnd && jobEnd >= newJobStart)
        );
      });

      if (hasOverlap) {
        errors.start_date = 'This pad already has a job scheduled during this time period';
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    // ... rest of submit logic ...
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 1,
              fontWeight: 500,
            }}
          >
            Jobs
          </Typography>
          <Typography variant="body1" color="grey.400">
            {activeCount} active and {completedCount} completed jobs
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setCreateJobModalOpen(true)}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          Add Job
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as typeof filters.status }))}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All Jobs</MenuItem>
              <MenuItem value="active">Active Jobs</MenuItem>
              <MenuItem value="completed">Completed Jobs</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Operator"
              value={filters.operator}
              onChange={(e) => setFilters(prev => ({ ...prev, operator: e.target.value, pad: 'all' }))}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All Operators</MenuItem>
              {sortedOperators.map(operator => (
                <MenuItem key={operator} value={operator}>{operator}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Pad"
              value={filters.pad}
              onChange={(e) => setFilters(prev => ({ ...prev, pad: e.target.value }))}
              disabled={filters.operator === 'all'}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="all">All Pads</MenuItem>
              {filteredPads.map(pad => (
                <MenuItem key={pad} value={pad}>{pad}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <Grid 
        container 
        spacing={2}
      >
        {filteredJobs.map(job => (
          <Grid 
            item 
            xs={12}
            sm={6}
            md={6}
            lg={4}
            key={job.id}
            sx={{
              minWidth: '300px',
              maxWidth: '298px',
              flex: {
                xs: '0 0 100%',
                sm: '0 0 298px',
                md: '0 0 298px',
                lg: '0 0 298px'
              }
            }}
          >
            <JobCard 
              job={job} 
              metrics={calculateJobMetrics(job, incidents)}
              incidents={incidents}
            />
          </Grid>
        ))}
        {filteredJobs.length === 0 && (
          <Grid item xs={12}>
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 8,
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" color="grey.500" gutterBottom>
                No jobs found
              </Typography>
              <Typography variant="body2" color="grey.600">
                {filters.status === 'all' 
                  ? 'There are no jobs matching the selected filters'
                  : `There are no ${filters.status} jobs matching the selected filters`
                }
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      <CreateJobModal
        open={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        onSuccess={fetchData}
      />
    </Box>
  );
};

export default Jobs; 
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  CardActionArea,
  useTheme,
  useMediaQuery,
  Autocomplete,
  TextField,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import {
  format,
  subDays,
  subHours,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  eachDayOfInterval,
  parseISO,
  differenceInHours,
  isWithinInterval,
  addHours,
} from 'date-fns';
import { API_BASE_URL } from '../../config';
import { useNavigate } from 'react-router-dom';

interface TimeMetrics {
  timestamp: Date;
  uptime: number;
  downtime: number;
  faultHours: {
    Frac: number;
    ShearFrac: number;
    Other: number;
  };
}

interface DowntimeCategory {
  category: string;
  hours: number;
  percentage: number;
}

interface DowntimeType {
  type: string;
  hours: number;
  percentage: number;
}

interface DowntimeTrend {
  date: string;
  hours: number;
  count: number;
}

interface DashboardMetrics {
  activeJobs: number;
  totalIncidents: number;
  timeMetrics: TimeMetrics[];
  totalUptime: number;
  totalDowntime: number;
  uptimePercentage: number;
  downtimePercentage: number;
  downtimeByCategory: DowntimeCategory[];
  downtimeByType: DowntimeType[];
  downtimeTrend: DowntimeTrend[];
}

interface Job {
  id: number;
  status: string;
  start_date: string;
  end_date: string | null;
  pad_id: number;
  operator_name: string;
  pad_name: string;
}

interface Incident {
  id: number;
  job_id: number;
  type_id: number;
  start_time: string;
  end_time: string;
  fault: 'Frac' | 'ShearFrac' | 'Other';
}

interface IncidentType {
  id: number;
  name: string;
}

type TooltipData = Omit<TimeMetrics, 'timestamp'> & {
  timestamp: string;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as TooltipData;
    return (
      <Box sx={{ 
        bgcolor: 'background.paper', 
        p: 2, 
        borderRadius: 1,
        boxShadow: 2,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="success.main" sx={{ mb: 0.5 }}>
          Uptime: {data.uptime.toFixed(1)}%
        </Typography>
        {data.downtime > 0 && (
          <>
            <Typography variant="body2" color="error.main" sx={{ mb: 0.5 }}>
              Downtime: {data.downtime.toFixed(1)}%
            </Typography>
            {Object.entries(data.faultHours)
              .filter(([_, hours]) => hours > 0)
              .map(([fault, hours]) => (
                <Typography 
                  key={fault} 
                  variant="body2" 
                  color={
                    fault === 'Frac' ? 'warning.main' :
                    fault === 'ShearFrac' ? 'info.main' : 'error.main'
                  }
                  sx={{ ml: 2, fontSize: '0.8rem' }}
                >
                  {fault}: {hours.toFixed(1)}h
                </Typography>
              )
            )}
          </>
        )}
      </Box>
    );
  }
  return null;
};

// Add new interface for period statistics
interface PeriodStatistics {
  totalUptime: number;
  totalDowntime: number;
  incidentCount: number;
  faultBreakdown: {
    Frac: { count: number; hours: number };
    ShearFrac: { count: number; hours: number };
    Other: { count: number; hours: number };
  };
  typeBreakdown: {
    [key: string]: { count: number; hours: number };
  };
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d' | '6m' | '1y'>('24h');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodStats, setPeriodStats] = useState<PeriodStatistics | null>(null);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [pads, setPads] = useState<string[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedPad, setSelectedPad] = useState<string>('all');
  const [jobStatus, setJobStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleIncidentCardClick = () => {
    const params = new URLSearchParams();
    params.set('time_range', timeRange);
    if (selectedOperator !== 'all') params.set('operator', selectedOperator);
    if (selectedPad !== 'all') params.set('pad', selectedPad);
    if (jobStatus !== 'all') params.set('job_status', jobStatus);
    
    navigate(`/incidents?${params.toString()}`);
  };

  const handleChartBarClick = (data: any) => {
    const params = new URLSearchParams();
    params.set('time_range', timeRange);
    if (selectedOperator !== 'all') params.set('operator', selectedOperator);
    if (selectedPad !== 'all') params.set('pad', selectedPad);
    if (jobStatus !== 'all') params.set('job_status', jobStatus);
    
    // Add specific incident type filter if clicking on incident distribution chart
    if (data.incidentType) {
      params.set('type', data.incidentType);
    }
    
    // Add specific time filter if clicking on timeline chart
    if (data.timestamp) {
      params.set('start_time', format(data.timestamp, "yyyy-MM-dd'T'HH:mm:ss"));
      params.set('end_time', format(addHours(data.timestamp, 1), "yyyy-MM-dd'T'HH:mm:ss"));
    }

    navigate(`/incidents?${params.toString()}`);
  };

  const handleFaultClick = (fault: string) => {
    navigate(`/incidents?time_range=${timeRange}&fault_category=${fault}`);
  };

  const handleTypeClick = (typeId: number) => {
    navigate(`/incidents?time_range=${timeRange}&type=${typeId}`);
  };

  const getTimeRangeParams = (range: string) => {
    const now = new Date();
    let start: Date;
    
    switch (range) {
      case '24h':
        start = subHours(now, 24);
        break;
      case '7d':
        start = subDays(now, 6);
        break;
      case '30d':
        start = subDays(now, 29);
        break;
      case '90d':
        start = subDays(now, 89);
        break;
      case '6m':
        start = subDays(now, 179);
        break;
      default: // 1y
        start = subDays(now, 364);
    }
    
    return {
      start: format(start, "yyyy-MM-dd'T'HH:mm"),
      end: format(now, "yyyy-MM-dd'T'HH:mm")
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, incidentsRes, typesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/jobs`),
        fetch(`${API_BASE_URL}/incidents`),
        fetch(`${API_BASE_URL}/incident-types`)
      ]);

      if (!jobsRes.ok || !incidentsRes.ok || !typesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [jobs, incidents, types]: [Job[], Incident[], IncidentType[]] = await Promise.all([
        jobsRes.json(),
        incidentsRes.json(),
        typesRes.json()
      ]);

      // Type guard for job data
      const isValidJob = (job: any): job is Job => {
        return job && 
          typeof job.id === 'number' && 
          typeof job.operator_name === 'string' && 
          typeof job.pad_name === 'string' &&
          typeof job.status === 'string' &&
          (job.status === 'active' || job.status === 'completed');
      };

      // Filter out invalid jobs and extract unique values
      const validJobs = jobs.filter(isValidJob);
      const uniqueOperators = Array.from(new Set(validJobs.map(job => job.operator_name)));
      const uniquePads = Array.from(new Set(validJobs.map(job => job.pad_name)));
      
      setOperators(uniqueOperators);
      setPads(uniquePads);
      setAllJobs(validJobs);
      setIncidentTypes(types);

      // Filter jobs based on selected filters
      const filteredJobs = validJobs.filter(job => {
        const operatorMatch = selectedOperator === 'all' || job.operator_name === selectedOperator;
        const padMatch = selectedPad === 'all' || job.pad_name === selectedPad;
        const statusMatch = jobStatus === 'all' || 
          (jobStatus === 'active' && job.status === 'active') ||
          (jobStatus === 'inactive' && job.status === 'completed');

        return operatorMatch && padMatch && statusMatch;
      });

      // Calculate time-based metrics
      const now = new Date();
      let timePoints: Date[];
      let interval: { start: Date; end: Date };

      switch (timeRange) {
        case '24h':
          interval = {
            start: subHours(now, 24),
            end: now
          };
          timePoints = eachHourOfInterval(interval);
          break;
        case '7d':
          interval = {
            start: startOfDay(subDays(now, 6)),
            end: endOfDay(now)
          };
          timePoints = eachDayOfInterval(interval);
          break;
        case '30d':
          interval = {
            start: startOfDay(subDays(now, 29)),
            end: endOfDay(now)
          };
          timePoints = eachDayOfInterval(interval);
          break;
        case '90d':
          interval = {
            start: startOfDay(subDays(now, 89)),
            end: endOfDay(now)
          };
          timePoints = eachDayOfInterval(interval);
          break;
        case '6m':
          interval = {
            start: startOfDay(subDays(now, 179)),
            end: endOfDay(now)
          };
          timePoints = eachDayOfInterval(interval);
          break;
        default: // 1y
          interval = {
            start: startOfDay(subDays(now, 364)),
            end: endOfDay(now)
          };
          timePoints = eachDayOfInterval(interval);
      }

      // Filter incidents within the selected time range and for filtered jobs
      const rangeIncidents = incidents.filter(incident => {
        const incidentStart = parseISO(incident.start_time);
        const incidentEnd = parseISO(incident.end_time);
        const timeMatch = incidentStart <= interval.end && incidentEnd >= interval.start;
        
        // Only include incidents from filtered jobs
        const jobMatch = filteredJobs.some(job => job.id === incident.job_id);
        
        return timeMatch && jobMatch;
      });

      const timeMetrics = timePoints.map(timestamp => {
        const pointInterval = timeRange === '24h' 
          ? { 
              start: timestamp, 
              end: new Date(timestamp.getTime() + 3600000) // 1 hour
            }
          : {
              start: startOfDay(timestamp),
              end: endOfDay(timestamp)
            };

        // Check if there are any active jobs in this period
        const activeJobsInPeriod = filteredJobs.some(job => {
          const jobStart = job.start_date ? new Date(job.start_date) : null;
          const jobEnd = job.end_date ? new Date(job.end_date) : new Date();
          return jobStart && jobStart <= pointInterval.end && jobEnd >= pointInterval.start;
        });

        const periodIncidents = rangeIncidents.filter(incident => {
          const incidentStart = parseISO(incident.start_time);
          const incidentEnd = parseISO(incident.end_time);
          return (incidentStart <= pointInterval.end && incidentEnd >= pointInterval.start);
        });

        const totalHours = timeRange === '24h' ? 1 : 24;
        const faultHours = {
          Frac: 0,
          ShearFrac: 0,
          Other: 0
        };

        periodIncidents.forEach(incident => {
          const incidentStart = parseISO(incident.start_time);
          const incidentEnd = parseISO(incident.end_time);
          const overlapStart = new Date(Math.max(incidentStart.getTime(), pointInterval.start.getTime()));
          const overlapEnd = new Date(Math.min(incidentEnd.getTime(), pointInterval.end.getTime()));
          const overlapHours = Math.max(0, differenceInHours(overlapEnd, overlapStart));

          if (incident.fault === 'Frac') {
            faultHours.Frac += overlapHours;
          } else if (incident.fault === 'ShearFrac') {
            faultHours.ShearFrac += overlapHours;
          } else {
            faultHours.Other += overlapHours;
          }
        });

        const totalDowntime = faultHours.Frac + faultHours.ShearFrac + faultHours.Other;
        // If no active jobs in period, show 0% uptime
        const uptime = activeJobsInPeriod ? Math.min(100, Math.max(0, ((totalHours - totalDowntime) / totalHours) * 100)) : 0;
        const downtime = activeJobsInPeriod ? Math.min(100, Math.max(0, (totalDowntime / totalHours) * 100)) : 0;

        return {
          timestamp,
          uptime,
          downtime,
          faultHours
        };
      });

      // Calculate period statistics with type breakdown
      const totalHours = timeRange === '24h' ? 24 : 
        timeRange === '7d' ? 24 * 7 :
        timeRange === '30d' ? 24 * 30 :
        timeRange === '90d' ? 24 * 90 :
        timeRange === '6m' ? 24 * 180 : 24 * 365;

      // Check if there were any active jobs in the entire period
      const hasActiveJobs = filteredJobs.some(job => {
        const jobStart = job.start_date ? new Date(job.start_date) : null;
        const jobEnd = job.end_date ? new Date(job.end_date) : new Date();
        return jobStart && jobStart <= interval.end && jobEnd >= interval.start;
      });

      const faultBreakdown = {
        Frac: { count: 0, hours: 0 },
        ShearFrac: { count: 0, hours: 0 },
        Other: { count: 0, hours: 0 }
      };

      const typeBreakdown: { [key: string]: { count: number; hours: number } } = {};
      types.forEach(type => {
        typeBreakdown[type.name] = { count: 0, hours: 0 };
      });

      let totalDowntimeHours = 0;

      rangeIncidents.forEach(incident => {
        const incidentStart = parseISO(incident.start_time);
        const incidentEnd = parseISO(incident.end_time);
        const overlapStart = new Date(Math.max(incidentStart.getTime(), interval.start.getTime()));
        const overlapEnd = new Date(Math.min(incidentEnd.getTime(), interval.end.getTime()));
        const hours = Math.max(0, differenceInHours(overlapEnd, overlapStart));

        totalDowntimeHours += hours;

        // Update fault breakdown
        if (incident.fault === 'Frac') {
          faultBreakdown.Frac.count++;
          faultBreakdown.Frac.hours += hours;
        } else if (incident.fault === 'ShearFrac') {
          faultBreakdown.ShearFrac.count++;
          faultBreakdown.ShearFrac.hours += hours;
        } else {
          faultBreakdown.Other.count++;
          faultBreakdown.Other.hours += hours;
        }

        // Update type breakdown
        const typeName = types.find(t => t.id === incident.type_id)?.name || 'Unknown';
        if (!typeBreakdown[typeName]) {
          typeBreakdown[typeName] = { count: 0, hours: 0 };
        }
        typeBreakdown[typeName].count++;
        typeBreakdown[typeName].hours += hours;
      });

      // Convert fault breakdown to chart format
      const downtimeByCategory = Object.entries(faultBreakdown).map(([category, stats]) => ({
        category,
        hours: stats.hours,
        percentage: (stats.hours / totalDowntimeHours) * 100
      })).sort((a, b) => b.hours - a.hours);

      // Convert type breakdown to chart format
      const downtimeByType = Object.entries(typeBreakdown).map(([type, stats]) => ({
        type,
        hours: stats.hours,
        percentage: (stats.hours / totalDowntimeHours) * 100
      })).sort((a, b) => b.hours - a.hours);

      // Calculate downtime trend
      const downtimeTrend = timePoints.map(date => {
        const dayIncidents = rangeIncidents.filter(incident => {
          const incidentStart = parseISO(incident.start_time);
          const incidentEnd = parseISO(incident.end_time);
          return isWithinInterval(date, { start: incidentStart, end: incidentEnd });
        });

        return {
          date: format(date, timeRange === '24h' ? 'HH:mm' : 'MMM d'),
          hours: dayIncidents.reduce((total, incident) => {
            const incidentStart = parseISO(incident.start_time);
            const incidentEnd = parseISO(incident.end_time);
            const overlapStart = new Date(Math.max(incidentStart.getTime(), startOfDay(date).getTime()));
            const overlapEnd = new Date(Math.min(incidentEnd.getTime(), endOfDay(date).getTime()));
            return total + Math.max(0, differenceInHours(overlapEnd, overlapStart));
          }, 0),
          count: dayIncidents.length
        };
      });

      // If no active jobs in period, show 0% uptime
      const totalUptime = hasActiveJobs ? totalHours - totalDowntimeHours : 0;
      const uptimePercentage = hasActiveJobs ? ((totalHours - totalDowntimeHours) / totalHours) * 100 : 0;
      const downtimePercentage = hasActiveJobs ? (totalDowntimeHours / totalHours) * 100 : 0;

      setMetrics({
        activeJobs: filteredJobs.filter(job => job.status === 'active').length,
        totalIncidents: rangeIncidents.length,
        timeMetrics,
        totalUptime,
        totalDowntime: totalDowntimeHours,
        uptimePercentage,
        downtimePercentage,
        downtimeByCategory,
        downtimeByType,
        downtimeTrend
      });

      setPeriodStats({
        totalUptime: uptimePercentage,
        totalDowntime: downtimePercentage,
        incidentCount: rangeIncidents.length,
        faultBreakdown,
        typeBreakdown
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger data fetch when filters change
  useEffect(() => {
    // Skip data fetch if we're about to navigate away
    if (!window.location.pathname.includes('/incidents')) {
      fetchData();
    }
  }, [timeRange, selectedOperator, selectedPad, jobStatus]);

  // Filter pads based on selected operator
  useEffect(() => {
    if (selectedOperator === 'all') {
      setPads(Array.from(new Set(allJobs.map((job: Job) => job.pad_name))));
    } else {
      const operatorPads = allJobs
        .filter((job: Job) => job.operator_name === selectedOperator)
        .map((job: Job) => job.pad_name);
      setPads(Array.from(new Set(operatorPads)));
    }
    // Reset pad selection when operator changes
    if (selectedPad !== 'all') {
      setSelectedPad('all');
    }
  }, [selectedOperator, allJobs]);

  const handleActiveJobsClick = () => {
    const params = new URLSearchParams();
    params.set('status', 'active');
    
    // Add any other current filters
    if (selectedOperator !== 'all') params.set('operator', selectedOperator);
    if (selectedPad !== 'all') params.set('pad', selectedPad);
    if (timeRange !== '24h') params.set('time_range', timeRange);
    
    navigate(`/jobs?${params.toString()}`);
  };

  if (loading || !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {/* Main Summary Cards */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Card sx={{ 
                  bgcolor: 'background.paper', 
                  boxShadow: 2,
                  height: '100%',
                  minHeight: { xs: '120px', sm: 'auto' }
                }}>
                  <CardActionArea onClick={handleActiveJobsClick} sx={{ height: '100%' }}>
                    <CardContent sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>Active Jobs</Typography>
                      <Typography variant="h3" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>{metrics.activeJobs}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    boxShadow: 2,
                    height: '100%',
                    minHeight: { xs: '120px', sm: 'auto' },
                    cursor: 'pointer'
                  }}
                  onClick={handleIncidentCardClick}
                >
                  <CardContent sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>Total Incidents</Typography>
                    <Typography variant="h3" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>{metrics.totalIncidents}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Statistics Section */}
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'background.paper', boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'stretch', sm: 'center' },
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 3
                    }}>
                      <Typography variant="h6" sx={{ 
                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                        wordBreak: 'normal',
                        whiteSpace: 'normal',
                        flexShrink: 0
                      }}>
                        Statistics for {timeRange === '24h' ? 'Last 24 Hours' : 
                                      timeRange === '7d' ? 'Last 7 Days' :
                                      timeRange === '30d' ? 'Last 30 Days' :
                                      timeRange === '90d' ? 'Last 90 Days' :
                                      timeRange === '6m' ? 'Last 6 Months' : 'Last Year'}
                      </Typography>

                      <Box sx={{ 
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        width: { xs: '100%', sm: 'auto' }
                      }}>
                        <FormControl size="small">
                          <Autocomplete
                            size="small"
                            options={['all', ...operators]}
                            value={selectedOperator}
                            onChange={(event, newValue) => setSelectedOperator(newValue || 'all')}
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
                                  minWidth: '180px',
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                                    '& fieldset': {
                                      borderColor: 'rgba(255, 255, 255, 0.23)',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: 'rgba(255, 255, 255, 0.4)',
                                    },
                                    '& .MuiOutlinedInput-input': {
                                      padding: '7px 14px',
                                    }
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)'
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
                        </FormControl>

                        <FormControl size="small">
                          <Autocomplete
                            size="small"
                            options={['all', ...pads]}
                            value={selectedPad}
                            onChange={(event, newValue) => setSelectedPad(newValue || 'all')}
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
                                  minWidth: '180px',
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                                    '& fieldset': {
                                      borderColor: 'rgba(255, 255, 255, 0.23)',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: 'rgba(255, 255, 255, 0.4)',
                                    },
                                    '& .MuiOutlinedInput-input': {
                                      padding: '7px 14px',
                                    }
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)'
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
                        </FormControl>

                        <FormControl size="small">
                          <Select
                            value={jobStatus}
                            onChange={(e) => setJobStatus(e.target.value as 'all' | 'active' | 'inactive')}
                            displayEmpty
                            sx={{ 
                              minWidth: '180px',
                              borderRadius: 2,
                              bgcolor: 'rgba(0, 0, 0, 0.2)',
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.23)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.4)',
                              }
                            }}
                          >
                            <MenuItem value="all">Show All Job Statuses</MenuItem>
                            <MenuItem value="active">Active Jobs Only</MenuItem>
                            <MenuItem value="inactive">Completed Jobs Only</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl size="small">
                          <Select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d' | '90d' | '6m' | '1y')}
                            displayEmpty
                            sx={{ 
                              minWidth: '180px',
                              borderRadius: 2,
                              bgcolor: 'rgba(0, 0, 0, 0.2)',
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.23)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.4)',
                              }
                            }}
                          >
                            <MenuItem value="24h">Last 24 Hours</MenuItem>
                            <MenuItem value="7d">Last 7 Days</MenuItem>
                            <MenuItem value="30d">Last 30 Days</MenuItem>
                            <MenuItem value="90d">Last 90 Days</MenuItem>
                            <MenuItem value="6m">Last 6 Months</MenuItem>
                            <MenuItem value="1y">Last Year</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>

                    {/* Charts Section */}
                    {isMobile ? (
                      // Mobile Text Summary View
                      <Box sx={{ py: 2 }}>
                        {/* Uptime Summary */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                            Job Performance
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            <Typography variant="body2" color="success.main" sx={{ mb: 0.5 }}>
                              Current Uptime: {metrics.timeMetrics[metrics.timeMetrics.length - 1].uptime.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              Average Uptime: {(metrics.timeMetrics.reduce((acc, curr) => acc + curr.uptime, 0) / metrics.timeMetrics.length).toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" color="error.main" sx={{ mb: 0.5 }}>
                              Total Downtime: {metrics.totalDowntime.toFixed(1)} hours
                            </Typography>
                          </Box>
                        </Box>

                        {/* Incident Type Summary */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                            Incident Distribution
                          </Typography>
                          <Box sx={{ pl: 2 }}>
                            {metrics.downtimeByType
                              .filter(type => type.percentage > 0)
                              .map((type, index) => (
                                <Box key={type.type} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: CHART_COLORS[index % CHART_COLORS.length],
                                      mr: 1
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {type.type}: {type.percentage.toFixed(1)}% ({type.hours.toFixed(1)}h)
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      // Desktop Charts View
                      <>
                        {/* Add Text Sections */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                          <Grid item xs={12} md={6}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                                Job Performance
                              </Typography>
                              <Box sx={{ pl: 2 }}>
                                <Typography variant="body2" color="success.main" sx={{ mb: 0.5 }}>
                                  Current Uptime: {metrics.timeMetrics[metrics.timeMetrics.length - 1].uptime.toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>
                                  Average Uptime: {(metrics.timeMetrics.reduce((acc, curr) => acc + curr.uptime, 0) / metrics.timeMetrics.length).toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" color="error.main" sx={{ mb: 0.5 }}>
                                  Total Downtime: {metrics.totalDowntime.toFixed(1)} hours
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                                Incident Distribution
                              </Typography>
                              <Box sx={{ pl: 2 }}>
                                {metrics.downtimeByType
                                  .filter(type => type.percentage > 0)
                                  .map((type, index) => (
                                    <Box key={type.type} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                                      <Box
                                        sx={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: '50%',
                                          bgcolor: CHART_COLORS[index % CHART_COLORS.length],
                                          mr: 1
                                        }}
                                      />
                                      <Typography variant="body2">
                                        {type.type}: {type.percentage.toFixed(1)}% ({type.hours.toFixed(1)}h)
                                      </Typography>
                                    </Box>
                                  ))}
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Existing Charts */}
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ 
                              height: { xs: 300, sm: 400 },
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end'
                            }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={metrics.timeMetrics.map(m => ({
                                    ...m,
                                    timestamp: format(
                                      m.timestamp,
                                      timeRange === '24h' ? 'HH:mm' : 'MMM d'
                                    )
                                  }))}
                                  margin={{ 
                                    top: 20, 
                                    right: 20, 
                                    left: 20, 
                                    bottom: 60 
                                  }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                  <XAxis 
                                    dataKey="timestamp"
                                    tick={{ 
                                      fill: 'rgba(255, 255, 255, 0.7)', 
                                      fontSize: isMobile ? 10 : 12 
                                    }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={isMobile ? 80 : 60}
                                    interval={isMobile ? 1 : 0}
                                  />
                                  <YAxis 
                                    tick={{ 
                                      fill: 'rgba(255, 255, 255, 0.7)', 
                                      fontSize: isMobile ? 10 : 12 
                                    }}
                                    unit="%"
                                    domain={[0, 100]}
                                    width={isMobile ? 35 : 45}
                                  />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Bar 
                                    dataKey="uptime" 
                                    fill="#4caf50"
                                    name="Uptime %"
                                    radius={[4, 4, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <Box sx={{ 
                              height: { xs: 300, sm: 400 },
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end'
                            }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={metrics.downtimeByType.filter(type => type.percentage > 0)}
                                  layout="vertical"
                                  margin={{ 
                                    top: 20, 
                                    right: 20, 
                                    left: 120, 
                                    bottom: 60 
                                  }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                                  <XAxis 
                                    type="number" 
                                    tick={{ 
                                      fill: 'rgba(255, 255, 255, 0.7)', 
                                      fontSize: isMobile ? 10 : 11 
                                    }}
                                    unit="%" 
                                  />
                                  <YAxis
                                    type="category"
                                    dataKey="type"
                                    tick={isMobile ? false : { 
                                      fill: 'rgba(255, 255, 255, 0.7)', 
                                      fontSize: 11,
                                      textAnchor: 'end',
                                      dx: -10
                                    }}
                                    width={isMobile ? 10 : 120}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#1e1e1e',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '4px',
                                      padding: '8px',
                                      color: 'rgba(255, 255, 255, 0.9)',
                                      textAlign: 'left'
                                    }}
                                    formatter={(value: number, name: string, props: any) => [
                                      <span style={{ 
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        paddingLeft: '10px'
                                      }}>{`${value.toFixed(1)}% (${props.payload.hours.toFixed(1)}h)`}</span>,
                                      ''
                                    ]}
                                    labelFormatter={(label) => (
                                      <span style={{ 
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                      }}>{label}</span>
                                    )}
                                  />
                                  <Bar 
                                    dataKey="percentage" 
                                    name="Percentage"
                                    radius={[0, 4, 4, 0]}
                                  >
                                    {metrics.downtimeByType
                                      .filter(type => type.percentage > 0)
                                      .map((entry, index) => (
                                        <Cell 
                                          key={`cell-${index}`} 
                                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                        />
                                      ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

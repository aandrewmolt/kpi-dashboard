import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Card,
  CardContent,
  useTheme,
  Button
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { API_BASE_URL } from '../../config';
import { api } from '../../utils/api';

interface Incident {
  id: number;
  job_id: number;
  type_id: number;
  description: string;
  start_time: string;
  end_time: string;
  fault: string;
}

interface Job {
  id: number;
  pad_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
  operator_name: string;
  pad_name: string;
}

interface Pad {
  id: number;
  name: string;
  operator_id: number;
}

interface IncidentType {
  id: number;
  name: string;
  description: string;
  fault_category_id: number;
}

interface FaultCategory {
  id: number;
  name: string;
  description: string;
}

interface Metrics {
  totalUptime: number;
  totalDowntime: number;
  uptimePercentage: number;
  downtimePercentage: number;
  downtimeByCategory: Array<{
    category: string;
    hours: number;
    percentage: number;
  }>;
  downtimeByType: Array<{
    type: string;
    hours: number;
    percentage: number;
  }>;
  downtimeTrend: Array<{
    date: string;
    hours: number;
    count: number;
  }>;
  downtimeByPad: Array<{
    pad: string;
    hours: number;
    percentage: number;
  }>;
}

interface FilterState {
  startDate: string;
  endDate: string;
  selectedOperator: string;
  selectedPad: string;
  faultCategoryId: string;
  view: 'hours' | 'percentage';
  faultCategory: string;
}

interface Operator {
  id: number;
  name: string;
  role: string;
}

interface DateRange {
  label: string;
  days: number;
}

const DATE_RANGES: DateRange[] = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '1 Year', days: 365 }
];

// Add ErrorBoundary component
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: 1,
            bgcolor: 'rgba(255, 0, 0, 0.1)',
          }}
        >
          <Typography color="error">
            Something went wrong loading this chart. Please try refreshing the page.
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Add data validation helper
const validateMetricsData = (metrics: Metrics | null): boolean => {
  if (!metrics) return false;

  // Validate required properties
  const requiredArrays = [
    'downtimeByCategory',
    'downtimeByType',
    'downtimeTrend',
    'downtimeByPad'
  ];

  for (const key of requiredArrays) {
    if (!Array.isArray(metrics[key as keyof Metrics])) {
      console.error(`Missing or invalid ${key} data`);
      return false;
    }
  }

  // Validate numeric values
  if (
    typeof metrics.totalUptime !== 'number' ||
    typeof metrics.totalDowntime !== 'number' ||
    typeof metrics.uptimePercentage !== 'number' ||
    typeof metrics.downtimePercentage !== 'number'
  ) {
    console.error('Invalid metric values');
    return false;
  }

  return true;
};

export default function DowntimeAnalytics() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [faultCategories, setFaultCategories] = useState<FaultCategory[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    selectedOperator: 'all',
    selectedPad: 'all',
    faultCategoryId: '',
    view: 'hours',
    faultCategory: 'all'
  });
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredPads, setFilteredPads] = useState<Pad[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const theme = useTheme();

  // Helper function to calculate incident duration in hours
  const calculateIncidentDuration = (incident: Incident): number => {
    const startTime = new Date(incident.start_time);
    const endTime = new Date(incident.end_time);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    console.log('Incident Duration:', {
      id: incident.id,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      duration: duration.toFixed(2) + ' hours'
    });
    return duration;
  };

  const handleDateRangeClick = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setFilters({
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  // Add useEffect for filtering pads based on selected operator
  useEffect(() => {
    if (filters.selectedOperator === 'all') {
      setFilteredPads(pads);
    } else {
      const operatorPads = pads.filter(pad => {
        const job = jobs.find(j => j.pad_id === pad.id);
        return job && job.operator_name === filters.selectedOperator;
      });
      setFilteredPads(operatorPads);
    }
    // Reset pad selection when operator changes
    if (filters.selectedPad !== 'all') {
      setFilters(prev => ({ ...prev, selectedPad: 'all' }));
    }
  }, [filters.selectedOperator, pads, jobs]);

  // Update calculateMetrics to include validation
  const calculateMetrics = useCallback(() => {
    if (!incidents.length || !jobs.length || !incidentTypes.length || !pads.length || !faultCategories.length) {
      console.warn('Missing required data for metrics calculation');
      return null;
    }

    try {
      // Filter jobs based on operator and pad selection
      const relevantJobs = jobs.filter(job => {
        const pad = pads.find(p => p.id === job.pad_id);
        if (!pad) return false;

        const operatorMatch = filters.selectedOperator === 'all' || 
          job.operator_name === filters.selectedOperator;
        const padMatch = filters.selectedPad === 'all' || 
          job.pad_name === filters.selectedPad;

        return operatorMatch && padMatch;
      });

      // Calculate total job hours for relevant jobs
      const jobHoursDetails = relevantJobs.map(job => {
        const startDate = new Date(job.start_date);
        const endDate = job.status === 'active' ? new Date() : new Date(job.end_date || new Date());
        const hours = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
        
        console.log('Job Hours:', {
          jobId: job.id,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          status: job.status,
          hours: hours.toFixed(2) + ' hours'
        });

        return {
          jobId: job.id,
          status: job.status,
          startDate: job.start_date,
          endDate: job.end_date || 'ongoing',
          hours
        };
      });

      const totalJobHours = jobHoursDetails.reduce((total, detail) => total + detail.hours, 0);
      console.log('Total Job Hours:', totalJobHours.toFixed(2));

      // Filter incidents based on relevant jobs and date range
      const filteredIncidents = incidents.filter(incident => {
        const job = relevantJobs.find(j => j.id === incident.job_id);
        if (!job) return false;

        const incidentDate = new Date(incident.start_time);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59);
        
        const dateInRange = incidentDate >= startDate && incidentDate <= endDate;
        const matchesFaultCategory = !filters.faultCategoryId || 
          incident.fault === faultCategories.find(f => f.id === parseInt(filters.faultCategoryId))?.name;

        console.log('Incident Filter:', {
          id: incident.id,
          date: incidentDate.toISOString(),
          inRange: dateInRange,
          matchesFault: matchesFaultCategory
        });

        return dateInRange && matchesFaultCategory;
      });

      // Calculate incident durations
      const incidentDetails = filteredIncidents.map(incident => {
        const duration = calculateIncidentDuration(incident);
        const job = jobs.find(j => j.id === incident.job_id);
        const pad = job ? pads.find(p => p.id === job.pad_id) : null;
        const incidentType = incidentTypes.find(t => t.id === incident.type_id);
        
        console.log('Incident Details:', {
          id: incident.id,
          type_id: incident.type_id,
          type_name: incidentType?.name,
          duration: duration.toFixed(2) + ' hours'
        });
        
        return {
          duration,
          type: incidentType?.name || 'Unknown Type',
          faultCategory: incident.fault || 'Unknown',
          pad_name: pad?.name || 'Unknown Pad'
        };
      });

      const totalDowntime = incidentDetails.reduce((total, incident) => total + incident.duration, 0);
      const totalUptime = Math.max(0, totalJobHours - totalDowntime);
      const uptimePercentage = totalJobHours > 0 ? (totalUptime / totalJobHours) * 100 : 0;
      const downtimePercentage = totalJobHours > 0 ? (totalDowntime / totalJobHours) * 100 : 0;

      // Calculate downtime by incident type (only include types with incidents)
      const downtimeByType = Object.entries(
        incidentDetails.reduce((acc, incident) => {
          if (incident.type !== 'Unknown Type') {
            acc[incident.type] = (acc[incident.type] || 0) + incident.duration;
          }
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, hours]) => ({
        type,
        hours,
        percentage: (hours / totalDowntime) * 100
      })).sort((a, b) => b.hours - a.hours);

      // Calculate downtime by fault category (only include categories with incidents)
      const downtimeByCategory = Object.entries(
        incidentDetails.reduce((acc, incident) => {
          if (incident.faultCategory !== 'Unknown') {
            acc[incident.faultCategory] = (acc[incident.faultCategory] || 0) + incident.duration;
          }
          return acc;
        }, {} as Record<string, number>)
      ).map(([category, hours]) => ({
        category,
        hours,
        percentage: (hours / totalDowntime) * 100
      })).sort((a, b) => b.hours - a.hours);

      // Calculate downtime trend by date
      const downtimeTrend = filteredIncidents.reduce((acc, incident) => {
        const date = new Date(incident.start_time).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { hours: 0, count: 0 };
        }
        acc[date].hours += calculateIncidentDuration(incident);
        acc[date].count += 1;
        return acc;
      }, {} as Record<string, { hours: number; count: number }>);

      // Convert to array and sort by date
      const downtimeTrendArray = Object.entries(downtimeTrend)
        .map(([date, data]) => ({
          date,
          hours: data.hours,
          count: data.count
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate downtime by pad
      const downtimeByPad = Object.entries(
        incidentDetails.reduce((acc, incident) => {
          acc[incident.pad_name] = (acc[incident.pad_name] || 0) + incident.duration;
          return acc;
        }, {} as Record<string, number>)
      ).map(([pad, hours]) => ({
        pad,
        hours,
        percentage: (hours / totalDowntime) * 100
      })).sort((a, b) => b.hours - a.hours);

      const metrics: Metrics = {
        totalUptime,
        totalDowntime,
        uptimePercentage,
        downtimePercentage,
        downtimeByCategory,
        downtimeByType,
        downtimeTrend: downtimeTrendArray,
        downtimeByPad
      };

      if (!validateMetricsData(metrics)) {
        throw new Error('Invalid metrics data calculated');
      }

      return metrics;
    } catch (error) {
      console.error('Error calculating metrics:', error);
      setDataError('Failed to calculate metrics. Please check the data integrity.');
      return null;
    }
  }, [incidents, jobs, incidentTypes, pads, faultCategories, filters]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [incidentsData, jobsData, padsData, typesData, categoriesData, operatorsData] = await Promise.all([
          api.get<Incident[]>('/incidents'),
          api.get<Job[]>('/jobs'),
          api.get<Pad[]>('/pads'),
          api.get<IncidentType[]>('/incident-types'),
          api.get<FaultCategory[]>('/fault-categories'),
          api.get<Operator[]>('/operators')
        ]);

        setIncidents(incidentsData);
        setJobs(jobsData);
        setPads(padsData);
        setIncidentTypes(typesData);
        setFaultCategories(categoriesData);
        setOperators(operatorsData);
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate metrics whenever the data changes
  useEffect(() => {
    const metricsData = calculateMetrics();
    if (metricsData) {
      setMetrics(metricsData);
    }
  }, [calculateMetrics]);

  const CHART_COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.info.main,
  ];

  return (
    <Box sx={{ p: 3 }}>
      {loading && (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && metrics && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartErrorBoundary>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Overall Uptime vs Downtime
                  </Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Uptime', value: metrics.uptimePercentage },
                            { name: 'Downtime', value: metrics.downtimePercentage }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#4caf50" />
                          <Cell fill="#f44336" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </Grid>

          {/* Wrap other charts in error boundary */}
          <Grid item xs={12} md={6}>
            <ChartErrorBoundary>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Downtime by Category
                  </Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.downtimeByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey={filters.view === 'hours' ? 'hours' : 'percentage'}
                          fill="#8884d8"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </Grid>

          {/* Add error boundaries for remaining charts */}
          <Grid item xs={12} md={6}>
            <ChartErrorBoundary>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Downtime by Type</Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      {filters.view === 'hours' ? (
                        <BarChart data={metrics?.downtimeByType}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="hours" 
                            name="Hours"
                          >
                            {metrics?.downtimeByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={metrics?.downtimeByType}
                            dataKey="percentage"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {metrics?.downtimeByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </Grid>

          <Grid item xs={12} md={6}>
            <ChartErrorBoundary>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Downtime Trend</Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metrics?.downtimeTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          yAxisId="left"
                          dataKey="hours" 
                          name="Downtime Hours" 
                          fill={theme.palette.error.main}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="count"
                          name="Incident Count"
                          stroke={theme.palette.warning.main}
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </Grid>

          <Grid item xs={12} md={6}>
            <ChartErrorBoundary>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Downtime by Pad</Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      {filters.view === 'hours' ? (
                        <BarChart data={metrics?.downtimeByPad}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="pad" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="hours" 
                            name="Hours"
                          >
                            {metrics?.downtimeByPad.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={metrics?.downtimeByPad}
                            dataKey="percentage"
                            nameKey="pad"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                          >
                            {metrics?.downtimeByPad.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
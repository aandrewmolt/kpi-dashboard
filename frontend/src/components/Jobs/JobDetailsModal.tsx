import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { format, parseISO, differenceInHours } from 'date-fns';
import { API_BASE_URL } from '../../config';
import CreateIncidentModal from './CreateIncidentModal';

interface Job {
  id: number;
  pad_id: number;
  operator_name?: string;
  pad_name?: string;
  start_date: string;
  end_date?: string;
  status: string;
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

interface Operator {
  id: number;
  name: string;
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

interface JobDetailsModalProps {
  open: boolean;
  onClose: () => void;
  job: Job;
  metrics: JobMetrics;
  incidents: Incident[];
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  open,
  onClose,
  job,
  metrics,
  incidents
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedPad, setSelectedPad] = useState('');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedJob, setEditedJob] = useState<Job>({
    ...job,
    start_date: job.start_date ? new Date(job.start_date).toISOString().slice(0, 16) : '',
    end_date: job.end_date ? new Date(job.end_date).toISOString().slice(0, 16) : ''
  });
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [createIncidentOpen, setCreateIncidentOpen] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [operatorsRes, padsRes, typesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/operators`),
          fetch(`${API_BASE_URL}/pads`),
          fetch(`${API_BASE_URL}/incident-types`)
        ]);

        if (!operatorsRes.ok || !padsRes.ok || !typesRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [operatorsData, padsData, typesData] = await Promise.all([
          operatorsRes.json(),
          padsRes.json(),
          typesRes.json()
        ]);

        setOperators(operatorsData);
        setPads(padsData);
        setIncidentTypes(typesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load incident types');
      } finally {
        setDataLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  // Calculate incident statistics only after data is loaded
  const incidentStats = React.useMemo(() => {
    if (dataLoading || !incidentTypes.length) {
      return {
        stats: {},
        totalDowntime: 0,
        getPercentage: () => 0
      };
    }

    const jobIncidents = incidents.filter(i => i.job_id === job.id);
    const totalDowntime = jobIncidents.reduce((total, incident) => {
      return total + differenceInHours(parseISO(incident.end_time), parseISO(incident.start_time));
    }, 0);

    const stats = jobIncidents.reduce((acc: { [key: string]: { count: number; hours: number } }, incident) => {
      const incidentType = incidentTypes.find(t => t.id === incident.type_id);
      const typeName = incidentType?.name || `Unknown Type (ID: ${incident.type_id})`;
      
      if (!acc[typeName]) {
        acc[typeName] = { count: 0, hours: 0 };
      }
      
      const hours = differenceInHours(parseISO(incident.end_time), parseISO(incident.start_time));
      acc[typeName].count++;
      acc[typeName].hours += hours;
      
      return acc;
    }, {});

    return {
      stats,
      totalDowntime,
      getPercentage: (hours: number) => ((hours / totalDowntime) * 100) || 0
    };
  }, [incidents, job.id, incidentTypes, dataLoading]);

  // Reset form when job changes or modal opens
  useEffect(() => {
    if (open && job) {
      setEditedJob({
        ...job,
        start_date: job.start_date ? new Date(job.start_date).toISOString().slice(0, 16) : '',
        end_date: job.end_date ? new Date(job.end_date).toISOString().slice(0, 16) : ''
      });
      setSelectedOperator(job.operator_name || '');
      setSelectedPad(job.pad_name || '');
    }
  }, [open, job]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // Find the selected pad object
      const selectedPadObj = pads.find(p => p.name === selectedPad);
      if (!selectedPadObj) {
        throw new Error('Invalid pad selection');
      }

      const response = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editedJob,
          pad_id: selectedPadObj.id,
          operator_name: selectedOperator,
          pad_name: selectedPad
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update job');
      }

      setIsEditing(false);
      window.location.reload(); // Refresh the page to show updated data
    } catch (err) {
      console.error('Error updating job:', err);
      setError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to delete job');
        }

        onClose();
        // Trigger refresh of parent component
        window.location.reload();
      } catch (error) {
        console.error('Error deleting job:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e1e',
          backgroundImage: 'none',
          minHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        pb: 2
      }}>
        <Box>
          <Typography variant="h5" component="div" sx={{ fontWeight: 500 }}>
            {isEditing ? 'Edit Job' : `${job.operator_name} - ${job.pad_name}`}
          </Typography>
          <Typography variant="body2" color="grey.400" sx={{ mt: 0.5 }}>
            Job #{job.id}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={job.status === 'active' ? 'Active' : 'Completed'} 
            color={job.status === 'active' ? 'success' : 'default'}
            size="small"
          />
          {!isEditing && (
            <>
              <IconButton 
                onClick={() => setCreateIncidentOpen(true)}
                sx={{ color: 'warning.main' }}
                title="Create Incident Report"
              >
                <AddCircleIcon />
              </IconButton>
              <IconButton 
                onClick={() => setIsEditing(true)}
                sx={{ color: 'primary.main' }}
              >
                <EditIcon />
              </IconButton>
            </>
          )}
          <IconButton 
            onClick={handleDelete}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Basic Information
              </Typography>
              {isEditing ? (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label="Operator"
                      value={selectedOperator}
                      onChange={(e) => {
                        setSelectedOperator(e.target.value);
                        setSelectedPad('');
                        setEditedJob({
                          ...editedJob,
                          operator_name: e.target.value,
                          pad_name: '',
                        });
                      }}
                    >
                      {operators.map((op) => (
                        <MenuItem key={op.id} value={op.name}>
                          {op.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      fullWidth
                      label="Pad"
                      value={selectedPad}
                      onChange={(e) => {
                        setSelectedPad(e.target.value);
                        setEditedJob({
                          ...editedJob,
                          pad_name: e.target.value,
                        });
                      }}
                      disabled={!selectedOperator}
                    >
                      {pads
                        .filter(pad => {
                          const operator = operators.find(op => op.name === selectedOperator);
                          return operator && pad.operator_id === operator.id;
                        })
                        .map((pad) => (
                          <MenuItem key={pad.id} value={pad.name}>
                            {pad.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      label="Start Date"
                      value={editedJob.start_date}
                      onChange={(e) => setEditedJob({
                        ...editedJob,
                        start_date: e.target.value,
                      })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  {job.status === 'completed' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="End Date"
                        value={editedJob.end_date}
                        onChange={(e) => setEditedJob({
                          ...editedJob,
                          end_date: e.target.value,
                        })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="grey.400">Start Date</Typography>
                    <Typography variant="body1">
                      {format(parseISO(job.start_date), 'MMM d, yyyy')}
                      <Typography variant="caption" display="block" color="grey.500">
                        {format(parseISO(job.start_date), 'h:mm a')}
                      </Typography>
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="grey.400">End Date</Typography>
                    <Typography variant="body1">
                      {job.end_date ? (
                        <>
                          {format(parseISO(job.end_date), 'MMM d, yyyy')}
                          <Typography variant="caption" display="block" color="grey.500">
                            {format(parseISO(job.end_date), 'h:mm a')}
                          </Typography>
                        </>
                      ) : (
                        'In Progress'
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* Metrics Summary */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="grey.400">Total Duration</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {metrics.totalHours.toFixed(1)}h
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="grey.400">Uptime</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, color: 'success.main' }}>
                    {metrics.uptimePercentage.toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="grey.400" gutterBottom>
                  Uptime Distribution
                </Typography>
                <Box sx={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', bgcolor: 'rgba(255, 255, 255, 0.05)', mb: 2 }}>
                  <Box sx={{ width: `${metrics.uptimePercentage}%`, bgcolor: 'success.main', height: '100%' }} />
                  <Box sx={{ width: `${metrics.faultPercentages.Frac}%`, bgcolor: 'warning.main', height: '100%' }} />
                  <Box sx={{ width: `${metrics.faultPercentages.ShearFrac}%`, bgcolor: 'info.main', height: '100%' }} />
                  <Box sx={{ width: `${metrics.faultPercentages.Other}%`, bgcolor: 'error.main', height: '100%' }} />
                </Box>
                <Grid container spacing={2}>
                  {[
                    { label: 'Uptime', hours: metrics.uptime, percent: metrics.uptimePercentage, color: 'success' },
                    { label: 'Frac', hours: metrics.faultHours.Frac, percent: metrics.faultPercentages.Frac, color: 'warning' },
                    { label: 'ShearFrac', hours: metrics.faultHours.ShearFrac, percent: metrics.faultPercentages.ShearFrac, color: 'info' },
                    { label: 'Other', hours: metrics.faultHours.Other, percent: metrics.faultPercentages.Other, color: 'error' }
                  ].map((metric) => (
                    <Grid item xs={6} sm={3} key={metric.label}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color={`${metric.color}.main`} sx={{ fontWeight: 500 }}>
                          {metric.label}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {metric.hours.toFixed(1)}h
                        </Typography>
                        <Typography variant="caption" color="grey.500">
                          {metric.percent.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Paper>
          </Grid>

          {/* Incident Type Statistics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Incident Type Statistics
              </Typography>
              <TableContainer>
                {dataLoading ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Total Hours</TableCell>
                        <TableCell align="right">% of Downtime</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(incidentStats.stats).map(([type, stats]) => (
                        <TableRow key={type}>
                          <TableCell>{type}</TableCell>
                          <TableCell align="right">{stats.count}</TableCell>
                          <TableCell align="right">{stats.hours.toFixed(1)}h</TableCell>
                          <TableCell align="right">
                            {incidentStats.getPercentage(stats.hours).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                      {!dataLoading && Object.keys(incidentStats.stats).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No incidents recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
            </Paper>
          </Grid>

          {/* Incidents List */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                Incidents
                <Chip 
                  label={incidents.filter(i => i.job_id === job.id).length} 
                  size="small" 
                  sx={{ ml: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                />
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                {dataLoading ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Fault Category</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {incidents
                        .filter(incident => incident.job_id === job.id)
                        .map((incident) => {
                          const incidentType = incidentTypes.find(t => t.id === incident.type_id);
                          const duration = differenceInHours(
                            parseISO(incident.end_time),
                            parseISO(incident.start_time)
                          );
                          return (
                            <TableRow key={incident.id}>
                              <TableCell>
                                {incidentType ? (
                                  <Typography variant="body2">
                                    {incidentType.name}
                                    {incidentType.description && (
                                      <Typography variant="caption" display="block" color="grey.500">
                                        {incidentType.description}
                                      </Typography>
                                    )}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="error">
                                    Loading incident type...
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>{incident.description}</TableCell>
                              <TableCell>
                                {format(parseISO(incident.start_time), 'MMM d, yyyy h:mm a')}
                              </TableCell>
                              <TableCell>
                                {format(parseISO(incident.end_time), 'MMM d, yyyy h:mm a')}
                              </TableCell>
                              <TableCell>{duration.toFixed(1)}h</TableCell>
                              <TableCell>
                                <Chip 
                                  label={incident.fault}
                                  size="small"
                                  color={
                                    incident.fault === 'Frac' ? 'warning' :
                                    incident.fault === 'ShearFrac' ? 'info' : 'error'
                                  }
                                  sx={{ minWidth: 80 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      {isEditing && (
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button 
            onClick={handleSave}
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      )}

      {/* Create Incident Modal */}
      <CreateIncidentModal
        open={createIncidentOpen}
        onClose={() => setCreateIncidentOpen(false)}
        jobId={job.id}
      />
    </Dialog>
  );
};

export default JobDetailsModal; 
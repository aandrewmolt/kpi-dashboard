import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { API_BASE_URL } from '../../config';
import { format } from 'date-fns';

interface CreateIncidentModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  onSuccess?: () => void;
}

interface IncidentType {
  id: number;
  name: string;
  description: string;
}

interface FaultCategory {
  id: number;
  name: string;
  description: string;
}

interface FormData {
  type_id: number;
  description: string;
  start_time: string;
  end_time: string;
  fault: string;
}

interface FormError {
  type_id?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  fault?: string;
}

const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  open,
  onClose,
  jobId,
  onSuccess
}) => {
  // Initialize with current date/time
  const now = new Date();
  const defaultDateTime = format(now, "yyyy-MM-dd'T'HH:mm");

  const [formData, setFormData] = useState<FormData>({
    type_id: 0,
    description: '',
    start_time: defaultDateTime,
    end_time: defaultDateTime,
    fault: '',
  });

  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [faultCategories, setFaultCategories] = useState<FaultCategory[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setFetchLoading(true);
      setApiError(null);
      try {
        const [typesResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/incident-types`),
          fetch(`${API_BASE_URL}/fault-categories`)
        ]);
        
        if (!typesResponse.ok || !categoriesResponse.ok) {
          throw new Error('Failed to fetch required data');
        }
        
        const [typesData, categoriesData] = await Promise.all([
          typesResponse.json(),
          categoriesResponse.json()
        ]);
        
        setIncidentTypes(typesData);
        setFaultCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setApiError('Failed to load required data. Please try again.');
      } finally {
        setFetchLoading(false);
      }
    };

    if (open) {
      fetchData();
      // Reset form with current date/time when opening
      const now = new Date();
      const currentDateTime = format(now, "yyyy-MM-dd'T'HH:mm");
      setFormData(prev => ({
        ...prev,
        start_time: currentDateTime,
        end_time: currentDateTime
      }));
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: FormError = {};
    let isValid = true;

    if (!formData.type_id) {
      newErrors.type_id = 'Please select an incident type';
      isValid = false;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
      isValid = false;
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
      isValid = false;
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
      isValid = false;
    }

    if (!formData.fault) {
      newErrors.fault = 'Fault category is required';
      isValid = false;
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        newErrors.end_time = 'End time must be after start time';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setApiError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          job_id: jobId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create incident');
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating incident:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type_id: 0,
      description: '',
      start_time: defaultDateTime,
      end_time: defaultDateTime,
      fault: '',
    });
    setErrors({});
    setApiError(null);
    onClose();
  };

  if (fetchLoading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            backgroundImage: 'none',
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
          Create Incident Report
          <IconButton onClick={handleClose} sx={{ color: 'grey.500' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 3 }}>
            {apiError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {apiError}
              </Alert>
            )}

            <Paper sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Incident Type"
                    value={formData.type_id}
                    onChange={(e) => setFormData({ ...formData, type_id: Number(e.target.value) })}
                    error={!!errors.type_id}
                    helperText={errors.type_id}
                    disabled={loading}
                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <MenuItem value={0} disabled>Select Incident Type</MenuItem>
                    {incidentTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Fault Category"
                    value={formData.fault}
                    onChange={(e) => setFormData({ ...formData, fault: e.target.value })}
                    error={!!errors.fault}
                    helperText={errors.fault}
                    disabled={loading}
                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <MenuItem value="" disabled>Select Fault Category</MenuItem>
                    {faultCategories.map((category) => (
                      <MenuItem key={category.id} value={category.name}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    error={!!errors.description}
                    helperText={errors.description}
                    disabled={loading}
                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="Start Time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    error={!!errors.start_time}
                    helperText={errors.start_time}
                    disabled={loading}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="End Time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    error={!!errors.end_time}
                    helperText={errors.end_time}
                    disabled={loading}
                    InputLabelProps={{ shrink: true }}
                    sx={{ bgcolor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Create Incident
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CreateIncidentModal; 
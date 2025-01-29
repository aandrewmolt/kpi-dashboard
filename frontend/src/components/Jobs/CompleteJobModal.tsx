import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  DialogContentText,
  CircularProgress,
  Alert,
  Box,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { API_BASE_URL } from '../../config';

interface Job {
  id: number;
  pad_id: number;
  operator_name?: string;
  pad_name?: string;
  start_date: string;
  end_date?: string;
  status: string;
}

interface CompleteJobModalProps {
  open: boolean;
  onClose: () => void;
  job: Job;
  onJobCompleted?: () => void;
}

const CompleteJobModal: React.FC<CompleteJobModalProps> = ({
  open,
  onClose,
  job,
  onJobCompleted
}) => {
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEndDate = (date: string): boolean => {
    const endDateTime = new Date(date);
    const startDateTime = new Date(job.start_date);
    const now = new Date();

    if (endDateTime < startDateTime) {
      setError('End date cannot be before start date');
      return false;
    }

    if (endDateTime > now) {
      setError('End date cannot be in the future');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!endDate) {
      setError('End date is required');
      return;
    }

    if (!validateEndDate(endDate)) {
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        end_date: endDate,
        status: 'completed' as const
      };

      const response = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete job');
      }

      const updatedJob = await response.json();
      onJobCompleted?.();
      handleClose();
    } catch (error) {
      console.error('Error completing job:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEndDate('');
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : handleClose}
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
        Complete Job
        {!loading && (
          <IconButton onClick={handleClose} sx={{ color: 'grey.500' }}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <DialogContentText sx={{ color: 'grey.400', mb: 2 }}>
            Please enter the completion date and time for job #{job.id} ({job.operator_name} - {job.pad_name})
          </DialogContentText>

          <TextField
            fullWidth
            type="datetime-local"
            label="End Date & Time"
            value={endDate}
            onChange={(e) => {
              setError(null);
              setEndDate(e.target.value);
            }}
            error={!!error}
            required
            InputLabelProps={{ shrink: true }}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Completing...' : 'Complete Job'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompleteJobModal; 
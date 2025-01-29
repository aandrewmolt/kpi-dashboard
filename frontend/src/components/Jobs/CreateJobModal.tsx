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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { API_BASE_URL } from '../../config';

interface Operator {
  id: number;
  name: string;
  status: string;
}

interface Pad {
  id: number;
  name: string;
  operator_id: number;
  deleted?: boolean;
}

interface CreateJobModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ open, onClose, onSuccess }) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    operator_id: '',
    pad_id: '',
    start_date: new Date().toISOString().slice(0, 16) // Set default to current date/time
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [operatorsRes, padsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/operators`),
        fetch(`${API_BASE_URL}/api/pads`)
      ]);

      if (!operatorsRes.ok) {
        throw new Error(`Failed to fetch operators: ${operatorsRes.statusText}`);
      }
      if (!padsRes.ok) {
        throw new Error(`Failed to fetch pads: ${padsRes.statusText}`);
      }

      const operatorsData = await operatorsRes.json();
      const padsData = await padsRes.json();

      // Add debug logging
      console.log('API responses:', {
        operators: operatorsData,
        pads: padsData
      });

      // Filter active operators and non-deleted pads
      const activeOperators = operatorsData.filter((op: Operator) => op.status === 'active');
      const availablePads = padsData.filter((pad: Pad) => !pad.deleted);

      setOperators(activeOperators);
      setPads(availablePads);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      // Reset form data when modal opens
      setFormData({
        operator_id: '',
        pad_id: '',
        start_date: new Date().toISOString().slice(0, 16)
      });
    }
  }, [open]);

  // Filter pads based on selected operator
  const filteredPads = pads.filter(pad => 
    formData.operator_id ? pad.operator_id === parseInt(formData.operator_id) : []
  );

  const handleSubmit = async () => {
    if (!formData.operator_id || !formData.pad_id || !formData.start_date) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pad_id: parseInt(formData.pad_id),
          start_date: formData.start_date
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating job:', err);
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
        Create New Job
        <IconButton onClick={onClose} sx={{ color: 'grey.500' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Operator"
              value={formData.operator_id}
              onChange={(e) => setFormData({ ...formData, operator_id: e.target.value, pad_id: '' })}
              disabled={loading}
            >
              {operators.map((operator) => (
                <MenuItem key={operator.id} value={operator.id}>
                  {operator.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Pad"
              value={formData.pad_id}
              onChange={(e) => setFormData({ ...formData, pad_id: e.target.value })}
              disabled={loading || !formData.operator_id}
            >
              {filteredPads.map((pad) => (
                <MenuItem key={pad.id} value={pad.id}>
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
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              disabled={loading}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !formData.operator_id || !formData.pad_id || !formData.start_date}
          variant="contained"
        >
          {loading ? <CircularProgress size={24} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateJobModal;
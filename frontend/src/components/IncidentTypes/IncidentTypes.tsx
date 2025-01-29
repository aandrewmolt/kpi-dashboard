import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import { format } from 'date-fns';

interface IncidentType {
  id: number;
  name: string;
  description: string;
  fault_category?: string;
  created_at: string;
}

const IncidentTypes: React.FC = () => {
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<IncidentType | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', fault_category: '' });
  const [error, setError] = useState<string | null>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIncidentTypes();
  }, []);

  const fetchIncidentTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/incident-types`);
      if (!response.ok) throw new Error('Failed to fetch incident types');
      const data = await response.json();
      setIncidentTypes(data);
    } catch (error) {
      console.error('Error fetching incident types:', error);
      setError('Failed to load incident types');
    }
  };

  const handleOpen = (type?: IncidentType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description,
        fault_category: type.fault_category || ''
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        fault_category: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingType(null);
    setFormData({
      name: '',
      description: '',
      fault_category: ''
    });
    setError('');
  };

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = editingType
        ? `${API_BASE_URL}/api/incident-types/${editingType.id}`
        : `${API_BASE_URL}/api/incident-types`;

      const response = await fetch(url, {
        method: editingType ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          fault_category: formData.fault_category
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save incident type');
      }

      const savedIncidentType = await response.json();
      
      // Update local state
      if (editingType) {
        setIncidentTypes(types => 
          types.map(type => type.id === editingType.id ? savedIncidentType : type)
        );
      } else {
        setIncidentTypes(types => [...types, savedIncidentType]);
      }

      handleClose();
    } catch (error) {
      console.error('Error saving incident type:', error);
      setError(error instanceof Error ? error.message : 'Failed to save incident type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this incident type?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/incident-types/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete incident type');
      
      await fetchIncidentTypes();
    } catch (error) {
      console.error('Error deleting incident type:', error);
      setError('Failed to delete incident type');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Incident Types</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add New Type
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incidentTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell>{type.id}</TableCell>
                <TableCell>{type.name}</TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell>
                  {format(new Date(type.created_at), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpen(type)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(type.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editingType ? 'Edit Incident Type' : 'Add New Incident Type'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmitIncident} variant="contained" disabled={!formData.name.trim()}>
            {editingType ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentTypes; 
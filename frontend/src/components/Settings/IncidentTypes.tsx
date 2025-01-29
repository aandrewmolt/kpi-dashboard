import React, { useState, useEffect } from 'react';
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { API_BASE_URL } from '../../config';

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

const IncidentTypes: React.FC = () => {
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [faultCategories, setFaultCategories] = useState<FaultCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [openFaultDialog, setOpenFaultDialog] = useState(false);
  const [editingType, setEditingType] = useState<IncidentType | null>(null);
  const [editingFault, setEditingFault] = useState<FaultCategory | null>(null);
  const [incidentFormData, setIncidentFormData] = useState({
    name: '',
    description: ''
  });
  const [faultFormData, setFaultFormData] = useState({
    name: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, faultCategoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/incident-types`),
        fetch(`${API_BASE_URL}/fault-categories`)
      ]);

      if (!typesRes.ok || !faultCategoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [typesData, categoriesData] = await Promise.all([
        typesRes.json(),
        faultCategoriesRes.json()
      ]);

      setIncidentTypes(typesData);
      setFaultCategories(categoriesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenIncidentDialog = (type?: IncidentType) => {
    if (type) {
      setEditingType(type);
      setIncidentFormData({
        name: type.name,
        description: type.description
      });
    } else {
      setEditingType(null);
      setIncidentFormData({
        name: '',
        description: ''
      });
    }
    setOpenIncidentDialog(true);
  };

  const handleOpenFaultDialog = (fault?: FaultCategory) => {
    if (fault) {
      setEditingFault(fault);
      setFaultFormData({
        name: fault.name,
        description: fault.description
      });
    } else {
      setEditingFault(null);
      setFaultFormData({
        name: '',
        description: ''
      });
    }
    setOpenFaultDialog(true);
  };

  const handleCloseIncidentDialog = () => {
    setOpenIncidentDialog(false);
    setEditingType(null);
    setIncidentFormData({
      name: '',
      description: ''
    });
  };

  const handleCloseFaultDialog = () => {
    setOpenFaultDialog(false);
    setEditingFault(null);
    setFaultFormData({
      name: '',
      description: ''
    });
  };

  const handleSubmitIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const url = editingType
        ? `${API_BASE_URL}/incident-types/${editingType.id}`
        : `${API_BASE_URL}/incident-types`;
      const method = editingType ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save incident type');
      }

      // Update local state optimistically
      const savedData = await response.json();
      if (editingType) {
        setIncidentTypes(types => 
          types.map(type => type.id === editingType.id ? savedData : type)
        );
      } else {
        setIncidentTypes(types => [...types, savedData]);
      }

      handleCloseIncidentDialog();
    } catch (err) {
      console.error('Error saving incident type:', err);
      setError(err instanceof Error ? err.message : 'Failed to save incident type');
    }
  };

  const handleSubmitFault = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const url = `${API_BASE_URL}/fault-categories` + (editingFault ? `/${editingFault.id}` : '');
      const method = editingFault ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(faultFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save fault category');
      }

      // Update local state optimistically
      const savedData = await response.json();
      if (editingFault) {
        setFaultCategories(categories => 
          categories.map(cat => cat.id === editingFault.id ? savedData : cat)
        );
      } else {
        setFaultCategories(categories => [...categories, savedData]);
      }

      handleCloseFaultDialog();
    } catch (err) {
      console.error('Error saving fault category:', err);
      setError(err instanceof Error ? err.message : 'Failed to save fault category');
    }
  };

  const handleDeleteIncident = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this incident type?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/incident-types/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete incident type');
      
      await fetchData();
    } catch (error) {
      console.error('Error deleting incident type:', error);
      setError('Failed to delete incident type');
    }
  };

  const handleDeleteFault = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this fault category?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/fault-categories/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete fault category');
        }

        // Update local state
        setFaultCategories(categories => categories.filter(cat => cat.id !== id));
      } catch (err) {
        console.error('Error deleting fault category:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete fault category');
      }
    }
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
      <Box mt={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Incident Types</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => handleOpenIncidentDialog()}
            >
              Add New Type
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidentTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.id}</TableCell>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>{type.description}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenIncidentDialog(type)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteIncident(type.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Fault Categories</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => handleOpenFaultDialog()}
            >
              Add New Category
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {faultCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenFaultDialog(category)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteFault(category.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Incident Type Dialog */}
      <Dialog open={openIncidentDialog} onClose={handleCloseIncidentDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingType ? 'Edit Incident Type' : 'Add New Incident Type'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="Name"
              value={incidentFormData.name}
              onChange={(e) => setIncidentFormData({ ...incidentFormData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={incidentFormData.description}
              onChange={(e) => setIncidentFormData({ ...incidentFormData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIncidentDialog}>Cancel</Button>
          <Button onClick={handleSubmitIncident} variant="contained" color="primary">
            {editingType ? 'Save Changes' : 'Add Type'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fault Category Dialog */}
      <Dialog open={openFaultDialog} onClose={handleCloseFaultDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingFault ? 'Edit Fault Category' : 'Add New Fault Category'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="Name"
              value={faultFormData.name}
              onChange={(e) => setFaultFormData({ ...faultFormData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={faultFormData.description}
              onChange={(e) => setFaultFormData({ ...faultFormData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFaultDialog}>Cancel</Button>
          <Button onClick={handleSubmitFault} variant="contained" color="primary">
            {editingFault ? 'Save Changes' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default IncidentTypes; 
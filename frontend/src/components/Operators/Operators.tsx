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
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  MenuItem,
  InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '../../config';

interface Operator {
  id: number;
  name: string;
  role: string;
  active?: boolean;
  activeJobs?: number;
  totalJobs?: number;
}

interface Pad {
  id: number;
  operator_id: number;
}

interface Job {
  id: number;
  pad_id: number;
  start_date: string;
  end_date?: string;
  operator_name: string;
}

interface FormData {
  name: string;
}

interface FormError {
  [key: string]: string;
}

const emptyFormData: FormData = {
  name: ''
};

// Add type guard function
const isValidOperator = (operator: any): operator is Operator => {
  return operator && typeof operator.id === 'number' && typeof operator.name === 'string';
};

const Operators: React.FC = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all' as 'all' | 'active' | 'inactive'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [operatorsRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/operators`),
        fetch(`${API_BASE_URL}/jobs`)
      ]);

      if (!operatorsRes.ok || !jobsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [operatorsData, jobsData] = await Promise.all([
        operatorsRes.json(),
        jobsRes.json()
      ]);

      // Filter out invalid operators
      const validOperators = operatorsData.filter(isValidOperator);

      // Determine active status and job counts
      const enrichedOperators = validOperators.map((operator: Operator) => {
        const operatorJobs = jobsData.filter((job: Job) => job.operator_name === operator.name);
        const activeJobs = operatorJobs.filter((job: Job) => !job.end_date).length;

        return {
          ...operator,
          active: activeJobs > 0,
          activeJobs,
          totalJobs: operatorJobs.length
        };
      });

      setOperators(enrichedOperators);
      setError(null);
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

  const handleOpenDialog = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setFormData({
        name: operator.name
      });
    } else {
      setEditingOperator(null);
      setFormData(emptyFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOperator(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const errors: FormError = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else {
      // Check for duplicate operator name
      const isDuplicate = operators.some(op => 
        op.name.toLowerCase() === formData.name.toLowerCase() && 
        (!editingOperator || op.id !== editingOperator.id)
      );
      if (isDuplicate) {
        errors.name = 'An operator with this name already exists';
      }
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      // First update the operator
      const operatorUrl = `${API_BASE_URL}/operators` + (editingOperator ? `/${editingOperator.id}` : '');
      const operatorResponse = await fetch(operatorUrl, {
        method: editingOperator ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(editingOperator ? { id: editingOperator.id } : {}),
          name: formData.name,
          role: 'Operator',
          status: 'active'
        }),
      });

      if (!operatorResponse.ok) {
        const errorData = await operatorResponse.json();
        throw new Error(errorData.error || 'Failed to save operator');
      }

      const savedOperator = await operatorResponse.json();

      // Update local state optimistically
      if (editingOperator) {
        setOperators(ops => ops.map(op => op.id === editingOperator.id ? savedOperator : op));
      } else {
        setOperators(ops => [...ops, savedOperator]);
      }

      // If we're editing and the name changed, update all related jobs
      if (editingOperator && editingOperator.name !== formData.name) {
        const jobsResponse = await fetch(`${API_BASE_URL}/jobs`);
        if (!jobsResponse.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const jobs: Job[] = await jobsResponse.json();
        
        // Update each job that belongs to this operator
        const updatePromises = jobs
          .filter(job => job.operator_name === editingOperator.name)
          .map(job => 
            fetch(`${API_BASE_URL}/jobs/${job.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...job,
                operator_name: formData.name
              }),
            })
          );

        await Promise.all(updatePromises);
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Error saving operator:', err);
      setError(err instanceof Error ? err.message : 'Failed to save operator');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this operator? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/operators/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete operator');
      }

      // Update local state
      setOperators(ops => ops.filter(op => op.id !== id));
    } catch (err) {
      console.error('Error deleting operator:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete operator');
    }
  };

  const filteredOperators = operators
    .filter(operator => {
      const searchMatch = !filters.searchTerm || 
        operator.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const statusMatch = filters.status === 'all' || 
        (filters.status === 'active' && operator.active) ||
        (filters.status === 'inactive' && !operator.active);
      return searchMatch && statusMatch;
    })
    .sort((a, b) => {
      // First sort by active status
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

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
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Operators</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => handleOpenDialog()}
        >
          Add New Operator
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search operators..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: 'background.paper' }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as typeof filters.status }))}
            sx={{ bgcolor: 'background.paper' }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Jobs</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOperators.map((operator) => (
              <TableRow key={operator.id || `temp-${operator.name}`}>
                <TableCell>{operator.id}</TableCell>
                <TableCell>{operator.name}</TableCell>
                <TableCell>{operator.role}</TableCell>
                <TableCell>
                  <Chip 
                    label={operator.active ? "Active" : "Inactive"} 
                    color={operator.active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {operator.activeJobs || 0} active / {operator.totalJobs || 0} total
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenDialog(operator)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDelete(operator.id)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredOperators.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No operators found matching the filters
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOperator ? 'Edit Operator' : 'Add New Operator'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingOperator ? 'Save Changes' : 'Add Operator'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Operators; 
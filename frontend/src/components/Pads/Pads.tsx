import React, { useState, useEffect, ChangeEvent, SyntheticEvent } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  MenuItem,
  Grid,
  InputAdornment,
  Autocomplete,
  AutocompleteProps,
  TextFieldProps
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { api } from '../../utils/api';

interface Job {
  id: number;
  pad_id: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed';
  incidents: number[];
  pad_name: string;
  operator_name: string;
}

interface Pad {
  id: number;
  name: string;
  location: string;
  operator_id: number;
  active?: boolean;
  jobs_count?: number;
  deleted: boolean;
}

interface Operator {
  id: number;
  name: string;
}

interface FormData {
  name: string;
  location: string;
  operator_id: string;
}

interface FormError {
  name?: string;
  location?: string;
  operator_id?: string;
}

const Pads: React.FC = () => {
  const [pads, setPads] = useState<Pad[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPad, setSelectedPad] = useState<Pad | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    operator_id: '',
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all' as 'all' | 'active' | 'inactive',
    operator: 'all'
  });
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [selectedOperator, setSelectedOperator] = useState<string>('all');

  const fetchPads = async () => {
    setLoading(true);
    try {
      const [padsData, operatorsData] = await Promise.all([
        api.get<Pad[]>('/pads'),
        api.get<Operator[]>('/operators')
      ]);
      
      // Fetch active jobs to determine pad status
      const jobs = await api.get<Job[]>('/jobs');
      
      // Type guard for pad data
      const isValidPad = (pad: any): pad is Pad => {
        return pad && 
          typeof pad.name === 'string' && 
          typeof pad.operator_id === 'number';
      };

      // Type guard for operator data
      const isValidOperator = (operator: any): operator is Operator => {
        return operator && 
          typeof operator.id === 'number' && 
          typeof operator.name === 'string';
      };
      
      // Filter and enrich valid pads with status
      const validPads = padsData
        .filter(isValidPad)
        .map((pad: any) => ({
          ...pad,
          id: pad.id || Math.max(...padsData.map((p: any) => p.id || 0)) + 1, // Ensure ID exists
          active: jobs.some((job: any) => job.pad_id === (pad.id || 0) && !job.end_date),
          jobs_count: jobs.filter((job: any) => job.pad_id === (pad.id || 0)).length,
          location: pad.location || '',  // Ensure location is never undefined
          deleted: pad.deleted || false
        }));
      
      const validOperators = operatorsData.filter(isValidOperator);
      
      setPads(validPads);
      setOperators(validOperators);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPads();
  }, []);

  const handleOpenDialog = (pad?: Pad) => {
    if (pad) {
      setSelectedPad(pad);
      setFormData({
        name: pad.name,
        location: pad.location,
        operator_id: pad.operator_id ? pad.operator_id.toString() : '',
      });
    } else {
      setSelectedPad(null);
      setFormData({
        name: '',
        location: '',
        operator_id: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPad(null);
    setFormData({
      name: '',
      location: '',
      operator_id: '',
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOperatorChange = (
    _event: SyntheticEvent,
    newValue: string | null
  ) => {
    setSelectedOperator(newValue || 'all');
  };

  const handleAutocompleteInput = (params: TextFieldProps) => (
    <TextField
      {...params}
      label="Filter by Operator"
      placeholder="Type or select operator"
      variant="outlined"
      size="small"
    />
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const errors: FormError = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.operator_id) {
      errors.operator_id = 'Operator is required';
    }

    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const url = `/pads` + (selectedPad ? `/${selectedPad.id}` : '');
      const data = {
        ...(selectedPad ? { id: selectedPad.id } : {}),
        name: formData.name,
        location: formData.location,
        operator_id: parseInt(formData.operator_id)
      };

      const savedPad = await api.put<Pad>(url, data);

      // Update local state optimistically
      if (selectedPad) {
        setPads(pads => pads.map(pad => pad.id === selectedPad.id ? savedPad : pad));
      } else {
        setPads(pads => [...pads, savedPad]);
      }

      handleCloseDialog();
    } catch (err) {
      console.error('Error saving pad:', err);
      setError(err instanceof Error ? err.message : 'Failed to save pad');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this pad? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/pads/${id}`);
      await fetchPads();
    } catch (err) {
      console.error('Error deleting pad:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete pad');
    }
  };

  const filteredPads = pads
    .filter(pad => {
      // First filter out deleted pads
      if (pad.deleted) return false;

      const searchMatch = filters.searchTerm === '' || 
        pad.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (pad.location && pad.location.toLowerCase().includes(filters.searchTerm.toLowerCase()));
      
      const statusMatch = filters.status === 'all' || 
        (filters.status === 'active' && pad.active) ||
        (filters.status === 'inactive' && !pad.active);
      
      const operatorMatch = filters.operator === 'all' || 
        operators.find(op => op.id === pad.operator_id)?.name === filters.operator;

      return searchMatch && statusMatch && operatorMatch;
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

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Pads
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Pad
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search pads..."
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
        <Grid item xs={12} md={4}>
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
        <Grid item xs={12} md={4}>
          <Autocomplete
            size="small"
            options={['all', ...operators.map(op => op.name)]}
            value={selectedOperator}
            onChange={handleOperatorChange}
            renderInput={handleAutocompleteInput}
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Operator</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Jobs</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPads.map((pad) => (
              <TableRow key={pad.id}>
                <TableCell>{pad.id}</TableCell>
                <TableCell>{pad.name}</TableCell>
                <TableCell>{pad.location || '-'}</TableCell>
                <TableCell>
                  {operators.find(op => op.id === pad.operator_id)?.name || 'Unknown'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={pad.active ? 'Active' : 'Inactive'}
                    color={pad.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{pad.jobs_count || 0}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(pad)}
                    aria-label="edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(pad.id)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredPads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No pads found matching the filters
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {selectedPad ? 'Edit Pad' : 'Add Pad'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              fullWidth
              label="Operator"
              name="operator_id"
              value={formData.operator_id}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            >
              {operators.map((operator) => (
                <MenuItem key={operator.id} value={operator.id.toString()}>
                  {operator.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {selectedPad ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Pads; 
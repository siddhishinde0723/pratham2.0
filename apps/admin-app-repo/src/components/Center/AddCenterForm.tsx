import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  FormHelperText,
  CircularProgress,
  InputAdornment,
  ListSubheader,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  getCohortList,
  createCohort,
  updateCohortUpdate,
} from '@/services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import { useTranslation } from 'react-i18next';

interface AddCenterFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCenterForm: React.FC<AddCenterFormProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    parentId: '', // Cluster
    name: '',     // Center Name
    classId: '',  // Class
  });

  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clusterSearchTerm, setClusterSearchTerm] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');

  const fetchClusters = useCallback(async () => {
    setLoadingClusters(true);
    try {
      const response = await getCohortList({
        limit: 0,
        offset: 0,
        filters: {
          type: 'CLUSTER',
          status: ['active'],
        },
      });
      
      if (response?.results?.cohortDetails) {
        setClusters(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setClusters(response);
      }
    } catch (err) {
      console.error('Error fetching clusters:', err);
    } finally {
      setLoadingClusters(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const response = await getCohortList({
        limit: 0,
        offset: 0,
        filters: {
          type: 'COHORT',
          status: ['active'],
        },
      });
      
      if (response?.results?.cohortDetails) {
        setClasses(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setClasses(response);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchClusters();
      fetchClasses();
      setFormData({ parentId: '', name: '', classId: '' });
      setErrors({});
      setClusterSearchTerm('');
      setClassSearchTerm('');
    }
  }, [open, fetchClusters, fetchClasses]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.parentId) newErrors.parentId = 'Cluster is required';
    if (!formData.name.trim()) newErrors.name = 'Center name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Create Center (SCHOOL)
      const centerPayload = {
        name: formData.name,
        type: 'SCHOOL',
        parentId: formData.parentId,
        status: 'active',
      };

      const response = await createCohort(centerPayload);
      
      const isSuccess = response?.responseCode === 200 || response?.responseCode === 201 || response?.success;
      const newCenterId = response?.result?.cohortId || response?.cohortId;

      if (isSuccess && newCenterId) {
        // 2. Associate Class if selected
        if (formData.classId) {
          try {
            await updateCohortUpdate(formData.classId, {
              parentId: newCenterId,
              type: 'COHORT',
            });
          } catch (classErr) {
            console.error('Error associating class:', classErr);
            showToastMessage('Center created but failed to associate class', 'warning');
          }
        }
        
        showToastMessage('Center created successfully', 'success');
        onSuccess();
        onClose();
      } else {
        throw new Error(response?.message || 'Failed to create center');
      }
    } catch (err: any) {
      console.error('Error creating center:', err);
      showToastMessage(err.message || 'Failed to create center', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Center</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Select Cluster */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.parentId}>
                <InputLabel>Select Cluster *</InputLabel>
                <Select
                  label="Select Cluster *"
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value as string })}
                  disabled={loading || loadingClusters}
                  onClose={() => setClusterSearchTerm('')}
                  MenuProps={{
                    autoFocus: false,
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <ListSubheader>
                    <TextField
                      size="small"
                      placeholder="Search Cluster..."
                      fullWidth
                      sx={{ 
                        mb: 0.5,
                        width: 'calc(100% - 16px)',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.paper',
                          fontSize: '0.875rem',
                        },
                        '& .MuiInputBase-input': {
                          padding: '6px 8px',
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      onChange={(e) => setClusterSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Escape') {
                          e.stopPropagation();
                        }
                      }}
                    />
                  </ListSubheader>
                  <MenuItem value=""><em>Select a cluster</em></MenuItem>
                  {clusters
                    .filter(c => c.name.toLowerCase().includes(clusterSearchTerm.toLowerCase()))
                    .map((cluster) => (
                      <MenuItem key={cluster.cohortId} value={cluster.cohortId}>
                        {cluster.name}
                      </MenuItem>
                    ))}
                  {clusters.filter(c => c.name.toLowerCase().includes(clusterSearchTerm.toLowerCase())).length === 0 && (
                    <MenuItem disabled>No clusters found</MenuItem>
                  )}
                </Select>
                {errors.parentId && <FormHelperText>{errors.parentId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Center Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Center Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                required
                disabled={loading}
                margin="dense"
              />
            </Grid>

            {/* Select Class */}
            {/* <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Select Class</InputLabel>
                <Select
                  label="Select Class"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value as string })}
                  disabled={loading || loadingClasses}
                  onClose={() => setClassSearchTerm('')}
                  MenuProps={{
                    autoFocus: false,
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <ListSubheader>
                    <TextField
                      size="small"
                      placeholder="Search Class..."
                      fullWidth
                      sx={{ 
                        mb: 0.5,
                        width: 'calc(100% - 16px)',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'background.paper',
                          fontSize: '0.875rem',
                        },
                        '& .MuiInputBase-input': {
                          padding: '6px 8px',
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      onChange={(e) => setClassSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Escape') {
                          e.stopPropagation();
                        }
                      }}
                    />
                  </ListSubheader>
                  <MenuItem value=""><em>Select a class (optional)</em></MenuItem>
                  {classes
                    .filter(cl => cl.name.toLowerCase().includes(classSearchTerm.toLowerCase()))
                    .map((cls) => (
                      <MenuItem key={cls.cohortId} value={cls.cohortId}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  {classes.filter(cl => cl.name.toLowerCase().includes(classSearchTerm.toLowerCase())).length === 0 && (
                    <MenuItem disabled>No classes found</MenuItem>
                  )}
                </Select>
                <FormHelperText>Optionally associate an existing class with this center</FormHelperText>
              </FormControl>
            </Grid> */}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={onClose} 
            disabled={loading} 
            startIcon={<CancelIcon />}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !formData.parentId || !formData.name.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ 
              minWidth: 120,
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              textTransform: 'none'
            }}
          >
            {loading ? 'Creating...' : 'Create Center'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddCenterForm;

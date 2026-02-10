import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  createCohort,
  updateCohortUpdate,
} from '@/services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';

interface ClusterFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  cluster?: any | null;
}

const ClusterForm: React.FC<ClusterFormProps> = ({ open, onClose, onSubmit, cluster }) => {
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (cluster) {
        setFormData({
          name: cluster.name || '',
          status: cluster.status || 'active',
        });
      } else {
        setFormData({
          name: '',
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [open, cluster]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Cluster name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (cluster) {
        // Edit Mode
        const updateData = {
          name: formData.name,
          status: formData.status,
          type: 'CLUSTER',
        };
        const response = await updateCohortUpdate(cluster.cohortId, updateData);
        if (response?.success || response?.responseCode === 200) {
          showToastMessage('Cluster updated successfully', 'success');
          onSubmit();
          onClose();
        } else {
          throw new Error(response?.message || 'Failed to update cluster');
        }
      } else {
        // Add Mode
        const createData = {
          name: formData.name,
          status: formData.status,
          type: 'CLUSTER',
        };
        const response = await createCohort(createData);
        if (response?.success || response?.responseCode === 201 || response?.responseCode === 200) {
          showToastMessage('Cluster created successfully', 'success');
          onSubmit();
          onClose();
        } else {
          throw new Error(response?.message || 'Failed to create cluster');
        }
      }
    } catch (err: any) {
      console.error('Error saving cluster:', err);
      showToastMessage(err.message || 'Failed to save cluster', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{cluster ? 'Edit Cluster' : 'Add New Cluster'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cluster Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                required
                disabled={loading}
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={loading}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} disabled={loading} startIcon={<CancelIcon />} variant="outlined">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !formData.name.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ 
              minWidth: 120,
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              textTransform: 'none'
            }}
          >
            {loading ? 'Saving...' : cluster ? 'Update Cluster' : 'Create Cluster'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ClusterForm;

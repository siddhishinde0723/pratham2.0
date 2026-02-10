import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Typography
} from '@mui/material';
import SimpleModal from './SimpleModal';
import { showToastMessage } from './Toastify';
import { updateUser } from '@/services/UserService';
import { validateMobile } from '../services/CohortService/cohortService';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
  userType: string;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onClose,
  onSuccess,
  user,
  userType,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    mobile: '',
  });

  const [initialFormData, setInitialFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    mobile: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && user) {
      // Map incoming user data to form fields
      const profile = user?.user?.profile || user?.profile || {};
      
      let middleName = user.middleName || profile.middleName || '';
      let gender = user.gender || profile.gender || '';
      
      // Look for middle name and gender in custom fields if not in direct props/profile
      if (!middleName || !gender) {
         const customFields = user.customField || user.customFields || [];
         customFields.forEach((field: any) => {
            const label = (field.label || '').toUpperCase();
            const fieldId = (field.fieldId || field.fieldid || '').toLowerCase();
            
            if (label === 'MIDDLE_NAME' || fieldId === 'middlename') {
                middleName = field.selectedValues?.[0] || field.value || '';
            }
            if (label === 'GENDER' || fieldId === 'gender') {
                const val = field.selectedValues?.[0] || field.value || '';
                if (typeof val === 'string') {
                    gender = val.toLowerCase();
                }
            }
         });
      }

      const initialData = {
        firstName: user.firstName || user.user?.firstName || '',
        lastName: user.lastName || user.user?.lastName || '',
        middleName: middleName,
        gender: gender.toLowerCase(),
        mobile: user.mobile || user.user?.phone || user.user?.mobile || '',
      };

      setFormData(initialData);
      setInitialFormData(initialData);
      setErrors({});
    }
  }, [open, user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isChanged = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (formData.mobile && !validateMobile(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        userData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          gender: formData.gender,
          mobile: formData.mobile,
        },
      };

      const response = await updateUser(user.userId, payload);

      if (response?.responseCode === 200 || response?.success) {
        showToastMessage(`${userType} details updated successfully!`, 'success');
        onSuccess();
        onClose();
      } else {
        throw new Error(response?.message || `Failed to update ${userType.toLowerCase()}`);
      }
    } catch (error: any) {
      console.error(`Error updating ${userType.toLowerCase()}:`, error);
      showToastMessage(error.message || `Failed to update ${userType.toLowerCase()} details`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      showFooter={false}
      modalTitle={`Edit ${userType} ${formData.firstName} ${formData.lastName}`}
    >
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              size="small"
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={!!errors.firstName}
              helperText={errors.firstName}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Middle Name"
              value={formData.middleName}
              onChange={(e) => handleChange('middleName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              size="small"
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={!!errors.lastName}
              helperText={errors.lastName}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select
                value={formData.gender}
                label="Gender"
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Mobile Number"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              error={!!errors.mobile}
              helperText={errors.mobile}
            />
          </Grid>
        </Grid>

        {!isChanged() && !loading && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block', textAlign: 'right' }}>
            No any updates in data
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !isChanged()}
            sx={{
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : `Update ${userType}`}
          </Button>
        </Box>
      </Box>
    </SimpleModal>
  );
};

export default EditUserModal;

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import { createAccount, CreateAccountRequest } from '@/services/AccountService';
import {
  readTenant,
  getRoleIdByTenantAndRoleName,
  TenantListItem,
} from '@/services/TenantApiService';

interface AddUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  userType: 'learner' | 'content-creator' | 'content-reviewer';
}

const AddUserForm: React.FC<AddUserFormProps> = ({
  onSuccess,
  onCancel,
  userType,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [tenantList, setTenantList] = useState<TenantListItem[] | null>(null);

  // Load tenant data on component mount
  useEffect(() => {
    const loadTenantData = async () => {
      try {
        const data = await readTenant();
        setTenantList(data);
      } catch (error) {
        console.error('Error loading tenant data:', error);
        setError('Failed to load tenant information');
      }
    };

    loadTenantData();
  }, []);

  // Password validation
  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8)
      return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password))
      return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password))
      return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password))
      return 'Password must contain at least one number';
    if (!/(?=.*[@$!%*?&])/.test(password))
      return 'Password must contain at least one special character (@$!%*?&)';
    return null;
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.username.trim()) errors.username = 'Username is required';

    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid for button state
  const isFormValid = (): boolean => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.gender !== '' &&
      formData.username.trim() !== '' &&
      formData.password !== '' &&
      validatePassword(formData.password) === null
    );
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form before submitting
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Get tenant ID from localStorage
      const tenantId = localStorage.getItem('tenantId');

      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }

      if (!tenantList) {
        throw new Error('Tenant data not loaded');
      }

      // Map user type to role name (matching exact case from API)
      const roleName =
        userType === 'learner'
          ? 'Learner'
          : userType === 'content-creator'
          ? 'Content creator'
          : 'Content reviewer';

      // Get role ID from tenant data
      const roleId = getRoleIdByTenantAndRoleName(
        tenantList,
        tenantId,
        roleName
      );

      if (!roleId) {
        throw new Error(`Role "${roleName}" not found in tenant`);
      }

      // Prepare account creation data
      const accountData: CreateAccountRequest = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username: formData.username,
        password: formData.password,
        gender: formData.gender,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobile: formData.phone, // Add mobile field from form phone input
        tenantCohortRoleMapping: [
          {
            tenantId: tenantId,
            roleId: roleId,
          },
        ],
      };

      console.log('Creating account with data:', accountData);

      // Make API call to create account
      const result = await createAccount(accountData);
      console.log('Account created successfully:', result);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        username: '',
        password: '',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating user:', error);

      // Extract specific error message from API response
      let errorMessage = 'Failed to create user. Please try again.';

      if (error?.response?.data?.params?.err) {
        // Handle API error format: "User already exist."
        errorMessage = error.response.data.params.err;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!tenantList) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading tenant information...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
        {t('COMMON.ADD_NEW')}{' '}
        {userType === 'learner'
          ? 'Learner'
          : userType === 'content-creator'
          ? 'Content Creator'
          : 'Content Reviewer'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              required
              error={!!validationErrors.firstName}
              helperText={validationErrors.firstName}
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              required
              error={!!validationErrors.lastName}
              helperText={validationErrors.lastName}
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required error={!!validationErrors.gender}>
              <InputLabel
                sx={{
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                }}
              >
                Gender
              </InputLabel>
              <Select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                label="Gender"
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              {validationErrors.gender && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.75 }}
                >
                  {validationErrors.gender}
                </Typography>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              required
              error={!!validationErrors.username}
              helperText={validationErrors.username}
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              error={!!validationErrors.password}
              helperText={
                validationErrors.password ||
                'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
              }
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
            />
          </Grid>
        </Grid>

        <Box
          sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}
        >
          <Button variant="outlined" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !isFormValid()}
            sx={{ backgroundColor: '#FDBE16' }}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AddUserForm;

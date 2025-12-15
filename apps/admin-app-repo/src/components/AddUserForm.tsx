/* eslint-disable @nx/enforce-module-boundaries */
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
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { createAccount, CreateAccountRequest } from '@/services/AccountService';
import {
  readTenant,
  getRoleIdByTenantAndRoleName,
  TenantListItem,
} from '@/services/TenantApiService';
import LocationService from '@/services/LocationService';
import { isSwadhaarChannel } from '@/services/DomainTenantService';
import { getFieldIdsByName } from '@/services/FieldsService';

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
  
  // Check if we should use the new form (only for Swadhaar learners)
  const useNewForm = userType === 'learner' && isSwadhaarChannel();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    username: '',
    password: '',
    state: '',
    district: '',
    block: '',
    village: '',
  });
  
  // Store location IDs (not just names) for API submission
  const [locationIds, setLocationIds] = useState({
    stateId: '',
    districtId: '',
    blockId: '',
    villageId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [tenantList, setTenantList] = useState<TenantListItem[] | null>(null);
  
  // Location filter states (only for learners)
  const [states, setStates] = useState<Array<{ id: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [blocks, setBlocks] = useState<Array<{ id: string; name: string }>>([]);
  const [villages, setVillages] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState({
    states: false,
    districts: false,
    blocks: false,
    villages: false,
  });
  
  // Store field IDs for location fields
  const [fieldIds, setFieldIds] = useState<Record<string, string>>({
    State: '',
    District: '',
    Block: '',
    Village: '',
  });

  // Load tenant data and field IDs on component mount
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

    const loadFieldIds = async () => {
      try {
        // Only load field IDs for new form (Swadhaar learners)
        if (useNewForm) {
          const tenantId = localStorage.getItem('tenantId');
          const fieldMap = await getFieldIdsByName(
            ['State', 'District', 'Block', 'Village'],
            tenantId || undefined
          );
          setFieldIds(fieldMap);
          console.log('Loaded field IDs:', fieldMap);
        }
      } catch (error) {
        console.error('Error loading field IDs:', error);
        // Don't set error state here, just log it - form can still work with fallback
      }
    };

    loadTenantData();
    loadFieldIds();
    
    // Load states only if using new form (Swadhaar learners)
    if (useNewForm) {
      loadStates();
    }
  }, [userType, useNewForm]);

  // Load states
  const loadStates = async () => {
    setLoadingLocations(prev => ({ ...prev, states: true }));
    try {
      const statesData = await LocationService.getStates();
      setStates(statesData);
    } catch (error) {
      console.error('Failed to load states:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, states: false }));
    }
  };

  // Load districts when state changes
  const loadDistricts = async (stateId: string) => {
    if (!stateId) {
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      return;
    }
    setLoadingLocations(prev => ({ ...prev, districts: true }));
    try {
      const districtsData = await LocationService.getDistricts(stateId);
      setDistricts(districtsData);
    } catch (error) {
      console.error('Failed to load districts:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, districts: false }));
    }
  };

  // Load blocks when district changes
  const loadBlocks = async (districtId: string) => {
    if (!districtId) {
      setBlocks([]);
      setVillages([]);
      return;
    }
    setLoadingLocations(prev => ({ ...prev, blocks: true }));
    try {
      const blocksData = await LocationService.getBlocks(districtId);
      setBlocks(blocksData);
    } catch (error) {
      console.error('Failed to load blocks:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, blocks: false }));
    }
  };

  // Load villages when block changes
  const loadVillages = async (blockId: string) => {
    if (!blockId) {
      setVillages([]);
      return;
    }
    setLoadingLocations(prev => ({ ...prev, villages: true }));
    try {
      const villagesData = await LocationService.getVillages(blockId);
      setVillages(villagesData);
    } catch (error) {
      console.error('Failed to load villages:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, villages: false }));
    }
  };

  // Handle location filter changes with cascading
  const handleLocationChange = (field: string) => (event: SelectChangeEvent<string>) => {
    const value = event.target.value as string;
    
    if (field === 'state') {
      const selectedState = states.find(s => s.name === value);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        district: '',
        block: '',
        village: ''
      }));
      setLocationIds(prev => ({
        ...prev,
        stateId: selectedState?.id || '',
        districtId: '',
        blockId: '',
        villageId: ''
      }));
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      if (value && selectedState) {
        loadDistricts(selectedState.id);
      }
    } else if (field === 'district') {
      const selectedDistrict = districts.find(d => d.name === value);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        block: '',
        village: ''
      }));
      setLocationIds(prev => ({
        ...prev,
        districtId: selectedDistrict?.id || '',
        blockId: '',
        villageId: ''
      }));
      setBlocks([]);
      setVillages([]);
      if (value && selectedDistrict) {
        loadBlocks(selectedDistrict.id);
      }
    } else if (field === 'block') {
      const selectedBlock = blocks.find(b => b.name === value);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        village: ''
      }));
      setLocationIds(prev => ({
        ...prev,
        blockId: selectedBlock?.id || '',
        villageId: ''
      }));
      setVillages([]);
      if (value && selectedBlock) {
        loadVillages(selectedBlock.id);
      }
    } else if (field === 'village') {
      const selectedVillage = villages.find(v => v.name === value);
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      setLocationIds(prev => ({
        ...prev,
        villageId: selectedVillage?.id || ''
      }));
    }
  };

  // Password validation
  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    
    // Check all requirements and return a single combined message if any fail
    const hasMinLength = password.length >= 8;
    const hasLowercase = /(?=.*[a-z])/.test(password);
    const hasUppercase = /(?=.*[A-Z])/.test(password);
    const hasNumber = /(?=.*\d)/.test(password);
    const hasSpecialChar = /(?=.*[@$!%*?&])/.test(password);
    
    if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
      return 'Password must be at least 8 characters long, include numerals, uppercase, lowercase, and special characters.';
    }
    
    return null;
  };

  // Phone number validation
  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) return 'Phone number is required';
    
    // Check if phone contains only digits
    if (!/^\d+$/.test(phone)) {
      return 'Phone number must contain only digits (0-9)';
    }
    
    // Check if phone is exactly 10 digits
    if (phone.length !== 10) {
      return 'Phone number must be exactly 10 digits';
    }
    
    return null;
  };

  // Old form validation (for non-Swadhaar or creators/reviewers)
  const validateFormOld = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // New form validation (for Swadhaar learners)
  const validateFormNew = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    
    // Validate phone number
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.phone = phoneError;

    // Only validate password if it has been entered
    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;
    } else {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form validation (routes to old or new)
  const validateForm = (): boolean => {
    return useNewForm ? validateFormNew() : validateFormOld();
  };

  // Check if form is valid for button state (old form)
  const isFormValidOld = (): boolean => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.username.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.password !== ''
    );
  };

  // Check if form is valid for button state (new form)
  const isFormValidNew = (): boolean => {
    const hasRequiredFields = 
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.password !== '';
    
    // Validate phone number format
    const isPhoneValid = validatePhone(formData.phone) === null;
    
    // Only validate password format if password is entered
    const isPasswordValid = formData.password 
      ? validatePassword(formData.password) === null 
      : false;

    return hasRequiredFields && isPhoneValid && isPasswordValid;
  };

  // Check if form is valid for button state (routes to old or new)
  const isFormValid = (): boolean => {
    return useNewForm ? isFormValidNew() : isFormValidOld();
  };

  const handleInputChange = (field: string, value: string) => {
    let finalValue = value;
    
    // For phone field, only allow digits and limit to 10 characters
    if (field === 'phone') {
      // Remove any non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      // Limit to 10 digits
      finalValue = digitsOnly.slice(0, 10);
    }
    
    setFormData((prev) => ({
      ...prev,
      [field]: finalValue,
    }));

    // Mark field as touched when user starts typing
    if (!touchedFields[field]) {
      setTouchedFields((prev) => ({
        ...prev,
        [field]: true,
      }));
    }

    // Validate field in real-time as user types (for phone and password)
    if (field === 'phone' || field === 'password') {
      // Validate immediately with the new value
      validateFieldWithValue(field, finalValue);
    } else {
      // Clear validation error for other fields when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const handleFieldBlur = (field: string) => {
    // Mark field as touched when user leaves the field
    if (!touchedFields[field]) {
      setTouchedFields((prev) => ({
        ...prev,
        [field]: true,
      }));
    }
    // Validate field on blur using current formData
    validateField(field);
  };

  const handleFieldFocus = (field: string) => {
    // Mark field as touched when user focuses on it
    if (!touchedFields[field]) {
      setTouchedFields((prev) => ({
        ...prev,
        [field]: true,
      }));
    }
    // Validate field on focus using current formData
    validateField(field);
  };

  const validateFieldWithValue = (field: string, value: string) => {
    setValidationErrors((prevErrors) => {
      const errors: Record<string, string> = { ...prevErrors };
      
      if (field === 'phone') {
        const phoneError = validatePhone(value);
        if (phoneError) {
          errors.phone = phoneError;
        } else {
          delete errors.phone;
        }
      } else if (field === 'password') {
        if (value) {
          const passwordError = validatePassword(value);
          if (passwordError) {
            errors.password = passwordError;
          } else {
            delete errors.password;
          }
        } else {
          errors.password = 'Password is required';
        }
      }
      
      return errors;
    });
  };

  const validateField = (field: string) => {
    setValidationErrors((prevErrors) => {
      const errors: Record<string, string> = { ...prevErrors };
      
      if (field === 'phone') {
        const phoneError = validatePhone(formData.phone);
        if (phoneError) {
          errors.phone = phoneError;
        } else {
          delete errors.phone;
        }
      } else if (field === 'password') {
        if (formData.password) {
          const passwordError = validatePassword(formData.password);
          if (passwordError) {
            errors.password = passwordError;
          } else {
            delete errors.password;
          }
        } else {
          errors.password = 'Password is required';
        }
      }
      
      return errors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Mark all fields as touched when form is submitted
    setTouchedFields({
      firstName: true,
      lastName: true,
      phone: true,
      password: true,
      email: true,
      username: true,
      gender: true,
    });

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

      // Determine username based on form type
      let finalUsername: string;
      if (useNewForm) {
        // New form: Use phone number as username if username is not provided
        finalUsername = formData.username.trim() || formData.phone.trim();
        if (!finalUsername) {
          throw new Error('Either username or phone number is required');
        }
      } else {
        // Old form: Username is mandatory
        finalUsername = formData.username.trim();
        if (!finalUsername) {
          throw new Error('Username is required');
        }
      }

      // Build customFields array for location fields (only for new form)
      let customFieldsArray: Array<{ fieldId: string; value: string[] }> = [];
      
      if (useNewForm) {
        console.log('Field IDs loaded:', fieldIds);
        console.log('Location IDs:', locationIds);
        
        // Build customFields array with proper checks
        const fieldsToAdd: Array<{ fieldId: string; value: string[] }> = [];
        
        // State field
        if (locationIds.stateId && fieldIds.State) {
          fieldsToAdd.push({
            fieldId: fieldIds.State,
            value: [locationIds.stateId]
          });
          console.log('Adding State field:', { fieldId: fieldIds.State, value: locationIds.stateId });
        } else {
          console.warn('State field missing - fieldId:', fieldIds.State, 'locationId:', locationIds.stateId);
        }
        
        // District field
        if (locationIds.districtId && fieldIds.District) {
          fieldsToAdd.push({
            fieldId: fieldIds.District,
            value: [locationIds.districtId]
          });
          console.log('Adding District field:', { fieldId: fieldIds.District, value: locationIds.districtId });
        } else {
          console.warn('District field missing - fieldId:', fieldIds.District, 'locationId:', locationIds.districtId);
        }
        
        // Block field
        if (locationIds.blockId && fieldIds.Block) {
          fieldsToAdd.push({
            fieldId: fieldIds.Block,
            value: [locationIds.blockId]
          });
          console.log('Adding Block field:', { fieldId: fieldIds.Block, value: locationIds.blockId });
        } else {
          console.warn('Block field missing - fieldId:', fieldIds.Block, 'locationId:', locationIds.blockId);
        }
        
        // Village field
        if (locationIds.villageId && fieldIds.Village) {
          fieldsToAdd.push({
            fieldId: fieldIds.Village,
            value: [locationIds.villageId]
          });
          console.log('Adding Village field:', { fieldId: fieldIds.Village, value: locationIds.villageId });
        } else {
          console.warn('Village field missing - fieldId:', fieldIds.Village, 'locationId:', locationIds.villageId);
        }
        
        customFieldsArray = fieldsToAdd;
        console.log('Final customFields array:', customFieldsArray);
      }

      // Prepare account creation data
      const accountData: CreateAccountRequest = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username: finalUsername,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        ...(formData.gender ? { gender: formData.gender || 'other' } : {}),
        ...(formData.email ? { email: formData.email } : {}),
        ...(formData.phone ? { mobile: formData.phone } : {}),
        tenantCohortRoleMapping: [
          {
            tenantId: tenantId,
            roleId: roleId,
          },
        ],
        // Only include customFields if array has items
        ...(customFieldsArray.length > 0 ? { customFields: customFieldsArray } : {}),
      };

      console.log('Creating account with data:', JSON.stringify(accountData, null, 2));

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
        state: '',
        district: '',
        block: '',
        village: '',
      });
      // Reset location dropdowns and IDs
      setLocationIds({
        stateId: '',
        districtId: '',
        blockId: '',
        villageId: '',
      });
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      // Reset touched fields
      setTouchedFields({});
      // Clear any errors
      setError(null);
      setValidationErrors({});

      onSuccess();
    } catch (error: unknown) {
      console.error('Error creating user:', error);

      // Extract specific error message from API response
      let errorMessage = 'Failed to create user. Please try again.';

      // Type guard to check if error has axios response structure
      const isAxiosError = (err: unknown): err is {
        response?: {
          data?: {
            params?: {
              errmsg?: string;
              err?: string;
              error?: string;
            };
            message?: string;
            error?: string;
            result?: {
              error?: string;
              message?: string;
            };
          };
        };
        message?: string;
      } => {
        return typeof err === 'object' && err !== null;
      };

      if (isAxiosError(error)) {
        // Try multiple possible error response formats
        // Priority: errmsg > err > error > message
        if (error.response?.data?.params?.errmsg) {
          // Format: { params: { errmsg: "gender must be a valid enum value" } }
          errorMessage = error.response.data.params.errmsg;
        } else if (error.response?.data?.params?.err) {
          // Format: { params: { err: "User already exist." } }
          errorMessage = error.response.data.params.err;
        } else if (error.response?.data?.params?.error) {
          // Another alternative format
          errorMessage = error.response.data.params.error;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.result?.error) {
          errorMessage = error.response.data.result.error;
        } else if (error.response?.data?.result?.message) {
          errorMessage = error.response.data.result.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
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
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 4, 
          textAlign: 'center',
          fontWeight: 600,
          color: '#1976d2'
        }}
      >
        {t('COMMON.ADD_NEW')}{' '}
        {userType === 'learner'
          ? 'Learner'
          : userType === 'content-creator'
          ? 'Content Creator'
          : 'Content Reviewer'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
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
              onBlur={() => handleFieldBlur('firstName')}
              required
              error={!!validationErrors.firstName && touchedFields.firstName}
              helperText={touchedFields.firstName ? validationErrors.firstName : ''}
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
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
              onBlur={useNewForm ? () => handleFieldBlur('lastName') : undefined}
              required
              error={useNewForm ? (!!validationErrors.lastName && touchedFields.lastName) : !!validationErrors.lastName}
              helperText={useNewForm ? (touchedFields.lastName ? validationErrors.lastName : '') : validationErrors.lastName}
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
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
              onBlur={useNewForm ? () => handleFieldBlur('email') : undefined}
              required={!useNewForm}
              error={useNewForm ? (!!validationErrors.email && touchedFields.email) : !!validationErrors.email}
              helperText={useNewForm ? (touchedFields.email ? validationErrors.email : '') : validationErrors.email}
              InputLabelProps={!useNewForm ? {
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              } : undefined}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
          </Grid>

          {useNewForm && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onFocus={() => handleFieldFocus('phone')}
                onBlur={() => handleFieldBlur('phone')}
                required
                error={!!validationErrors.phone && touchedFields.phone}
                helperText={touchedFields.phone ? validationErrors.phone : ''}
                inputProps={{
                  maxLength: 10,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                }}
                InputLabelProps={{
                  required: true,
                  sx: {
                    '& .MuiFormLabel-asterisk': {
                      color: 'red',
                    },
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />
            </Grid>
          )}

          {!useNewForm && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={useNewForm ? (!!validationErrors.gender && touchedFields.gender) : !!validationErrors.gender}>
              <InputLabel>Gender</InputLabel>
              <Select
                value={formData.gender}
                onChange={(e) => {
                  handleInputChange('gender', e.target.value);
                  if (useNewForm && !touchedFields.gender) {
                    setTouchedFields((prev) => ({ ...prev, gender: true }));
                  }
                }}
                onBlur={useNewForm ? () => handleFieldBlur('gender') : undefined}
                label="Gender"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    '&:hover': {
                      borderColor: '#1976d2',
                    },
                  },
                }}
              >
                <MenuItem value="">Select Gender</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              {validationErrors.gender && (useNewForm ? touchedFields.gender : true) && (
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
              onBlur={useNewForm ? () => handleFieldBlur('username') : undefined}
              required={!useNewForm}
              error={useNewForm ? (!!validationErrors.username && touchedFields.username) : !!validationErrors.username}
              helperText={useNewForm ? (touchedFields.username ? validationErrors.username : '') : validationErrors.username}
              InputLabelProps={!useNewForm ? {
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              } : undefined}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password"
              type={useNewForm && showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onFocus={useNewForm ? () => handleFieldFocus('password') : undefined}
              onBlur={useNewForm ? () => handleFieldBlur('password') : undefined}
              required
              error={useNewForm ? (!!validationErrors.password && touchedFields.password) : !!validationErrors.password}
              helperText={
                useNewForm
                  ? (touchedFields.password && validationErrors.password ? validationErrors.password : '')
                  : validationErrors.password
              }
              InputProps={useNewForm ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              } : undefined}
              InputLabelProps={{
                required: true,
                sx: {
                  '& .MuiFormLabel-asterisk': {
                    color: 'red',
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
          </Grid>

          {/* Location filters - only show for new form (Swadhaar learners) */}
          {useNewForm && (
            <>
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    mt: 3, 
                    mb: 2, 
                    pt: 2, 
                    borderTop: '2px solid #e0e0e0',
                  }}
                >
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      color: '#424242',
                      fontSize: '1.1rem'
                    }}
                  >
                    Location Information (Optional)
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={formData.state}
                    onChange={handleLocationChange('state')}
                    label="State"
                    disabled={loadingLocations.states}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        '&:hover': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  >
                    <MenuItem value="">Select State</MenuItem>
                    {states.map(state => (
                      <MenuItem key={state.id} value={state.name}>{state.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>District</InputLabel>
                  <Select
                    value={formData.district}
                    onChange={handleLocationChange('district')}
                    label="District"
                    disabled={loadingLocations.districts || !formData.state}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        '&:hover': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  >
                    <MenuItem value="">Select District</MenuItem>
                    {districts.map(district => (
                      <MenuItem key={district.id} value={district.name}>{district.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Block</InputLabel>
                  <Select
                    value={formData.block}
                    onChange={handleLocationChange('block')}
                    label="Block"
                    disabled={loadingLocations.blocks || !formData.district}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        '&:hover': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  >
                    <MenuItem value="">Select Block</MenuItem>
                    {blocks.map(block => (
                      <MenuItem key={block.id} value={block.name}>{block.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Village</InputLabel>
                  <Select
                    value={formData.village}
                    onChange={handleLocationChange('village')}
                    label="Village"
                    disabled={loadingLocations.villages || !formData.block}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        '&:hover': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                  >
                    <MenuItem value="">Select Village</MenuItem>
                    {villages.map(village => (
                      <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>

        <Box
          sx={{ 
            mt: 4, 
            pt: 3,
            borderTop: '2px solid #e0e0e0',
            display: 'flex', 
            gap: 2, 
            justifyContent: 'flex-end' 
          }}
        >
          <Button 
            variant="outlined" 
            onClick={onCancel} 
            disabled={loading}
            sx={{
              minWidth: 120,
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': {
                borderColor: '#1565c0',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !isFormValid()}
            sx={{ 
              minWidth: 120,
              backgroundColor: '#FDBE16',
              color: '#000',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#f5a800',
              },
              '&:disabled': {
                backgroundColor: '#e0e0e0',
                color: '#9e9e9e',
              },
            }}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AddUserForm;

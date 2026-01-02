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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
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
  userType: 'learner' | 'content-creator' | 'content-reviewer' | 'staff' | 'supervisor';
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
    department: '',
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
    
    // Validate password with same rules as new form
    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;
    } else {
      errors.password = 'Password is required';
    }

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
    const hasRequiredFields = (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.username.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.password !== ''
    );
    
    // Validate password format
    const isPasswordValid = formData.password 
      ? validatePassword(formData.password) === null 
      : false;

    return hasRequiredFields && isPasswordValid;
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
      department: true,
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
          : userType === 'content-reviewer'
          ? 'Content reviewer'
          : userType === 'staff'
          ? 'Staff'
          : userType === 'supervisor'
          ? 'Supervisor'
          : 'Learner';

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

      // Build customFields array for location fields (only for new form) and department (for staff)
      // `value` can be either a single string or an array of strings, depending on backend expectations
      let customFieldsArray: Array<{ fieldId: string; value: string | string[] }> = [];
      
      if (useNewForm) {
        console.log('Field IDs loaded:', fieldIds);
        console.log('Location IDs:', locationIds);
        
        // Build customFields array with proper checks
        const fieldsToAdd: Array<{ fieldId: string; value: string | string[] }> = [];
        
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
      
      // Add department field for staff and supervisor (OBLF)
      if ((userType === 'staff' || userType === 'supervisor') && formData.department) {
        const departmentFieldId = '0d501559-3bb2-44ed-8e33-850f6ed22666';
        customFieldsArray.push({
          fieldId: departmentFieldId,
          // Department should be sent as a single string value, not an array
          value: formData.department
        });
        console.log('Adding Department field:', { fieldId: departmentFieldId, value: formData.department });
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
        department: '',
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
        // Priority: err (user-friendly message) > errmsg (error code) > error > message
        if (error.response?.data?.params?.err) {
          // Format: { params: { err: "Mobile number must be 10 digits long" } }
          errorMessage = error.response.data.params.err;
        } else if (error.response?.data?.params?.errmsg) {
          // Format: { params: { errmsg: "BAD_REQUEST" } } - fallback to error code if err not available
          errorMessage = error.response.data.params.errmsg;
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
        <Typography>Loading form...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            borderRadius: 1
          }}
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* First Name */}
        <TextField
          fullWidth
          required
          size="small"
          label="First Name"
          placeholder="Enter first name"
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          onBlur={() => handleFieldBlur('firstName')}
          error={!!validationErrors.firstName && touchedFields.firstName}
          helperText={touchedFields.firstName ? validationErrors.firstName : ''}
          sx={{ mb: 2 }}
        />

        {/* Last Name */}
        <TextField
          fullWidth
          required
          size="small"
          label="Last Name"
          placeholder="Enter last name"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          onBlur={useNewForm ? () => handleFieldBlur('lastName') : undefined}
          error={useNewForm ? (!!validationErrors.lastName && touchedFields.lastName) : !!validationErrors.lastName}
          helperText={useNewForm ? (touchedFields.lastName ? validationErrors.lastName : '') : validationErrors.lastName}
          sx={{ mb: 2 }}
        />

        {/* Email */}
        <TextField
          fullWidth
          size="small"
          type="email"
          label="Email"
          placeholder="Enter email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={useNewForm ? () => handleFieldBlur('email') : undefined}
          required={!useNewForm}
          error={useNewForm ? (!!validationErrors.email && touchedFields.email) : !!validationErrors.email}
          helperText={useNewForm ? (touchedFields.email ? validationErrors.email : '') : validationErrors.email}
          sx={{ mb: 2 }}
        />

        {/* Phone/Mobile */}
        {useNewForm && (
          <TextField
            fullWidth
            required
            size="small"
            label="Mobile"
            placeholder="Enter mobile number"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            onFocus={() => handleFieldFocus('phone')}
            onBlur={() => handleFieldBlur('phone')}
            error={!!validationErrors.phone && touchedFields.phone}
            helperText={touchedFields.phone ? validationErrors.phone : ''}
            inputProps={{
              maxLength: 10,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            sx={{ mb: 2 }}
          />
        )}

        {!useNewForm && (
          <TextField
            fullWidth
            size="small"
            label="Phone Number"
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {/* Gender */}
        <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
          <FormLabel
            component="legend"
            sx={{ fontSize: '0.875rem', mb: 1 }}
          >
            Gender
          </FormLabel>
          <RadioGroup
            row
            value={formData.gender}
            onChange={(e) => {
              handleInputChange('gender', e.target.value);
              if (useNewForm && !touchedFields.gender) {
                setTouchedFields((prev) => ({ ...prev, gender: true }));
              }
            }}
            onBlur={useNewForm ? () => handleFieldBlur('gender') : undefined}
          >
            <FormControlLabel
              value="male"
              control={<Radio size="small" />}
              label="Male"
            />
            <FormControlLabel
              value="female"
              control={<Radio size="small" />}
              label="Female"
            />
            <FormControlLabel
              value="other"
              control={<Radio size="small" />}
              label="Other"
            />
          </RadioGroup>
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

        {/* Department (for staff and supervisor) */}
        {(userType === 'staff' || userType === 'supervisor') && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={formData.department}
              label="Department"
              onChange={(e) => handleInputChange('department', e.target.value)}
            >
              <MenuItem value="">Select Department</MenuItem>
              <MenuItem value="Health">Health</MenuItem>
              <MenuItem value="Education">Education</MenuItem>
              <MenuItem value="Livelihood">Livelihood</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Username */}
        <TextField
          fullWidth
          size="small"
          label="Username"
          placeholder="Enter username"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          onBlur={useNewForm ? () => handleFieldBlur('username') : undefined}
          required={!useNewForm}
          error={useNewForm ? (!!validationErrors.username && touchedFields.username) : !!validationErrors.username}
          helperText={useNewForm ? (touchedFields.username ? validationErrors.username : '') : validationErrors.username}
          sx={{ mb: 2 }}
        />

        {/* Password */}
        <TextField
          fullWidth
          required
          size="small"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          onFocus={() => handleFieldFocus('password')}
          onBlur={() => handleFieldBlur('password')}
          error={!!validationErrors.password && touchedFields.password}
          helperText={
            touchedFields.password && validationErrors.password ? validationErrors.password : ''
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Location filters - only show for new form (Swadhaar learners) */}
        {useNewForm && (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>State</InputLabel>
              <Select
                value={formData.state}
                onChange={handleLocationChange('state')}
                label="State"
                disabled={loadingLocations.states}
              >
                <MenuItem value="">Select State</MenuItem>
                {states.map(state => (
                  <MenuItem key={state.id} value={state.name}>{state.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>District</InputLabel>
              <Select
                value={formData.district}
                onChange={handleLocationChange('district')}
                label="District"
                disabled={loadingLocations.districts || !formData.state}
              >
                <MenuItem value="">Select District</MenuItem>
                {districts.map(district => (
                  <MenuItem key={district.id} value={district.name}>{district.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Block</InputLabel>
              <Select
                value={formData.block}
                onChange={handleLocationChange('block')}
                label="Block"
                disabled={loadingLocations.blocks || !formData.district}
              >
                <MenuItem value="">Select Block</MenuItem>
                {blocks.map(block => (
                  <MenuItem key={block.id} value={block.name}>{block.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Village</InputLabel>
              <Select
                value={formData.village}
                onChange={handleLocationChange('village')}
                label="Village"
                disabled={loadingLocations.villages || !formData.block}
              >
                <MenuItem value="">Select Village</MenuItem>
                {villages.map(village => (
                  <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        {/* Action Buttons */}
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}
        >
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !isFormValid()}
            sx={{
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
            }}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default AddUserForm;

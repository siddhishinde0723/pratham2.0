import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  Typography,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import SimpleModal from './SimpleModal';
import { showToastMessage } from './Toastify';
import {
  createUserStudentTeacher,
  validateEmail,
  USER_ROLES,
  CUSTOM_FIELDS,
} from '../services/CohortService/cohortService';
interface AddTeacherModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    username: '',
    password: '',
    // teacherId: '',
    gender: '',
    // role: '',
    // cefrLevel: '',
    // program: '',
    // subProgram: '',
    // supervisor: '',
    // villageName: '',
    // dateOfJoining: null as Dayjs | null,
    // oldTeacherId: '',
    // dateOfLeaving: null as Dayjs | null,
    // reasonForLeaving: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Phone number validation (same as AddUserForm)
  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) return null; // Optional field, no error if empty
    
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

  // Password validation (same as AddUserForm)
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

  const handleChange = (field: string, value: any) => {
    let finalValue = value;
    
    // For contactNumber field, only allow digits and limit to 10 characters (same as AddUserForm)
    if (field === 'contactNumber') {
      // Remove any non-digit characters
      const digitsOnly = String(value).replace(/\D/g, '');
      // Limit to 10 digits
      finalValue = digitsOnly.slice(0, 10);
    }
    
    setFormData((prev) => ({ ...prev, [field]: finalValue }));
    
    // Validate field in real-time as user types (for contactNumber and password) - same as AddUserForm
    if (field === 'contactNumber' || field === 'password') {
      if (field === 'contactNumber') {
        const phoneError = validatePhone(String(finalValue));
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (phoneError) {
            newErrors.contactNumber = phoneError;
          } else {
            delete newErrors.contactNumber;
          }
          return newErrors;
        });
      } else if (field === 'password') {
        const passwordError = validatePassword(String(finalValue));
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (passwordError) {
            newErrors.password = passwordError;
          } else {
            delete newErrors.password;
          }
          return newErrors;
        });
      }
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate password (same as AddUserForm)
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Validate contact number (same as AddUserForm - optional but format must be correct if provided)
    if (formData.contactNumber) {
      const phoneError = validatePhone(formData.contactNumber);
      if (phoneError) {
        newErrors.contactNumber = phoneError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const prepareUserData = () => {
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      throw new Error('Tenant ID not found');
    }
    const roleId = USER_ROLES.TEACHER.id;
    const roleType = 'teacher';
    const name = `${formData.firstName} ${formData.lastName}`;

    const userData = {
      name,
      username: formData.username,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      ...(formData.contactNumber && { mobile: formData.contactNumber }),
      ...(formData.gender && { gender: formData.gender }),
      tenantCohortRoleMapping: [
        {
          tenantId,
          roleId:
            roleType === 'teacher'
              ? USER_ROLES.TEACHER.id
              : USER_ROLES.STUDENT.id,
        },
      ],
      // ...(customFields.length > 0 && { customFields })
    };

    return userData;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      const userData = prepareUserData();

      console.log('Creating user with data:', userData);

      const response = await createUserStudentTeacher(userData);

      if (response?.responseCode === 201) {
        showToastMessage(`Teacher added successfully!`, 'success');
        console.log(`Teacher created:`, response.data);

        onSuccess();
        onClose();

        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          contactNumber: '',
          email: '',
          username: '',
          gender: '',
          password: '',
        });
        setErrors({});
        setError(null);
      } else {
        throw new Error(response.message || `Failed to create Teacher`);
      }
    } catch (error: any) {
      console.error(`Error creating Teacher:`, error);

      // Extract specific error message from API response (same as AddUserForm)
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

      // Show specific field errors if available
      if (error.response?.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(
          ([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[field] = messages[0];
            }
          }
        );
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: '',
      lastName: '',
      contactNumber: '',
      email: '',
      username: '',
      password: '',
      // teacherId: '',
      gender: '',
      // role: '',
      // cefrLevel: '',
      // program: '',
      // subProgram: '',
      // supervisor: '',
      // villageName: '',
      // dateOfJoining: null,
      // oldTeacherId: '',
      // dateOfLeaving: null,
      // reasonForLeaving: '',
    });
    setErrors({});
    setError(null);
    onClose();
  };

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      showFooter={false}
      modalTitle="New Teacher"
      isFullwidth={true}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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

          {/* Full Name */}
          <TextField
            fullWidth
            required
            size="small"
            label="First Name"
            placeholder="Enter first name"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={!!errors.firstName}
            helperText={errors.firstName}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            required
            size="small"
            label="Last Name"
            placeholder="Enter last name"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={!!errors.lastName}
            helperText={errors.lastName}
            sx={{ mb: 2 }}
          />
          {/* Contact Number */}
          <TextField
            fullWidth
            size="small"
            label="Contact Number"
            placeholder="Enter contact number"
            value={formData.contactNumber}
            onChange={(e) => handleChange('contactNumber', e.target.value)}
            error={!!errors.contactNumber}
            helperText={errors.contactNumber}
            inputProps={{
              maxLength: 10,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            sx={{ mb: 2 }}
          />

          {/* Email */}
          <TextField
            fullWidth
            required
            size="small"
            type="email"
            label="Email"
            placeholder="Enter email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            sx={{ mb: 2 }}
          />

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
              onChange={(e) => handleChange('gender', e.target.value)}
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
            {errors.gender && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {errors.gender}
              </Typography>
            )}
          </FormControl>

          {/* Username */}
          <TextField
            fullWidth
            required
            size="small"
            label="Username"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            error={!!errors.username}
            helperText={errors.username}
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
            onChange={(e) => handleChange('password', e.target.value)}
            error={!!errors.password}
            helperText={errors.password}
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

          {/* Teacher Id */}
          {/* <TextField
            fullWidth
            size="small"
            label="Teacher Id"
            placeholder="Enter teacher ID"
            value={formData.teacherId}
            onChange={(e) => handleChange('teacherId', e.target.value)}
            sx={{ mb: 2 }}
          /> */}

          {/* Role */}
          {/* <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => handleChange('role', e.target.value)}
            >
              <MenuItem value="">
                <em>Select Role</em>
              </MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
              <MenuItem value="headTeacher">Head Teacher</MenuItem>
              <MenuItem value="coordinator">Coordinator</MenuItem>
              <MenuItem value="mentor">Mentor</MenuItem>
            </Select>
          </FormControl> */}

          {/* CEFR Level */}
          {/* <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>CEFR Level</InputLabel>
            <Select
              value={formData.cefrLevel}
              label="CEFR Level"
              onChange={(e) => handleChange('cefrLevel', e.target.value)}
            >
              <MenuItem value="">
                <em>Select CEFR Level</em>
              </MenuItem>
              <MenuItem value="a1">A1 - Beginner</MenuItem>
              <MenuItem value="a2">A2 - Elementary</MenuItem>
              <MenuItem value="b1">B1 - Intermediate</MenuItem>
              <MenuItem value="b2">B2 - Upper Intermediate</MenuItem>
              <MenuItem value="c1">C1 - Advanced</MenuItem>
              <MenuItem value="c2">C2 - Proficient</MenuItem>
            </Select>
          </FormControl> */}

          {/* Program */}
          {/* <FormControl fullWidth size="small" required sx={{ mb: 2 }}>
            <InputLabel>Program</InputLabel>
            <Select
              value={formData.program}
              label="Program"
              onChange={(e) => handleChange('program', e.target.value)}
            >
              <MenuItem value="">
                <em>Select Program</em>
              </MenuItem>
              <MenuItem value="english">English Program</MenuItem>
              <MenuItem value="math">Math Program</MenuItem>
              <MenuItem value="science">Science Program</MenuItem>
              <MenuItem value="general">General Program</MenuItem>
            </Select>
          </FormControl> */}

          {/* Sub Program */}
          {/* <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Sub Program</InputLabel>
            <Select
              value={formData.subProgram}
              label="Sub Program"
              onChange={(e) => handleChange('subProgram', e.target.value)}
            >
              <MenuItem value="">
                <em>Select Sub Program</em>
              </MenuItem>
              <MenuItem value="primary">Primary</MenuItem>
              <MenuItem value="secondary">Secondary</MenuItem>
              <MenuItem value="senior">Senior</MenuItem>
            </Select>
          </FormControl> */}

          {/* Supervisor */}
          {/* <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Supervisor</InputLabel>
            <Select
              value={formData.supervisor}
              label="Supervisor"
              onChange={(e) => handleChange('supervisor', e.target.value)}
            >
              <MenuItem value="">
                <em>Select Supervisor</em>
              </MenuItem>
              <MenuItem value="supervisor1">John Doe</MenuItem>
              <MenuItem value="supervisor2">Jane Smith</MenuItem>
              <MenuItem value="supervisor3">Robert Johnson</MenuItem>
            </Select>
          </FormControl> */}

          {/* Village Name */}
          {/* <TextField
            fullWidth
            size="small"
            label="Village Name"
            placeholder="Enter village name"
            value={formData.villageName}
            onChange={(e) => handleChange('villageName', e.target.value)}
            sx={{ mb: 2 }}
          /> */}

          {/* Date Of Joining */}
          {/* <DatePicker
            label="Date Of joining *"
            value={formData.dateOfJoining}
            onChange={(newValue) => handleChange('dateOfJoining', newValue)}
            format="DD/MM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                sx: { mb: 2 },
              },
            }}
          /> */}

          {/* Old Teacher Id */}
          {/* <TextField
            fullWidth
            size="small"
            label="Old Teacher Id"
            placeholder="Enter old teacher ID"
            value={formData.oldTeacherId}
            onChange={(e) => handleChange('oldTeacherId', e.target.value)}
            sx={{ mb: 2 }}
          /> */}

          {/* Date Of Leaving */}
          {/* <DatePicker
            label="Date Of Leaving"
            value={formData.dateOfLeaving}
            onChange={(newValue) => handleChange('dateOfLeaving', newValue)}
            format="DD/MM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                sx: { mb: 2 },
              },
            }}
          /> */}

          {/* Reason For Leaving */}
          {/* <TextField
            fullWidth
            size="small"
            label="Reason For Leaving"
            placeholder="Enter reason for leaving"
            multiline
            rows={3}
            value={formData.reasonForLeaving}
            onChange={(e) => handleChange('reasonForLeaving', e.target.value)}
            sx={{ mb: 3 }}
          /> */}

          {/* Action Buttons */}
          <Box
            sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}
          >
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </Box>
        </Box>
      </LocalizationProvider>
    </SimpleModal>
  );
};

export default AddTeacherModal;

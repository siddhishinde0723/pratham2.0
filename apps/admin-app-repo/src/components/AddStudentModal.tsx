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
  Typography,
} from '@mui/material';
import SimpleModal from './SimpleModal';
import { showToastMessage } from './Toastify';
import {
  createUserStudentTeacher,
  generateUsername,
  validateEmail,
  validateMobile,
  USER_ROLES,
  DEFAULT_PASSWORD,
  CUSTOM_FIELDS,
} from '../services/CohortService/cohortService';
interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    gender: '',
    email: '',
    // grade: '',
    // program: '',
    // fatherName: '',
    // motherName: '',
    // accessToWhatsApp: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
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

    if (formData.contactNumber && !validateMobile(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const prepareUserData = () => {
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      throw new Error('Tenant ID not found');
    }
    const roleId = USER_ROLES.STUDENT.id;
    const roleType = 'student';
    const username = generateUsername(formData.firstName, formData.lastName);
    const name = `${formData.firstName} ${formData.lastName}`;

    const userData = {
      name,
      username,
      password: DEFAULT_PASSWORD,
      firstName: formData.firstName,
      lastName: formData.lastName,
      ...(formData.contactNumber && { mobile: formData.contactNumber }),
      ...(formData.email && { email: formData.email }),
      ...(formData.gender && { gender: formData.gender }),
      tenantCohortRoleMapping: [
        {
          tenantId,
          roleId:
            roleType === 'student'
              ? USER_ROLES.STUDENT.id
              : USER_ROLES.STUDENT.id,
        },
      ],
      // ...(customFields.length > 0 && { customFields })
    };

    return userData;
  };
  const handleSubmit = async () => {
    // Validation
    if (!validateForm()) {
      return;
    }
    // if (!formData.grade) {
    //   showToastMessage('Please select grade', 'warning');
    //   return;
    // }
    // if (!formData.program) {
    //   showToastMessage('Please select program', 'warning');
    //   return;
    // }
    // if (!formData.accessToWhatsApp) {
    //   showToastMessage('Please select WhatsApp access', 'warning');
    //   return;
    // }

    setLoading(true);
    try {
      const userData = prepareUserData();

      console.log('Creating user with data:', userData);

      const response = await createUserStudentTeacher(userData);

      if (response?.responseCode === 201) {
        showToastMessage(`Student added successfully!`, 'success');

        onSuccess();
        onClose();

        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          contactNumber: '',
          email: '',
          gender: '',
        });
      } else {
        throw new Error(response.message || `Failed to create Teacher`);
      }
    } catch (error: any) {
      console.error(`Error creating Teacher:`, error);

      // Extract error message
      let errorMessage = `Failed to create  Please try again.`;

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToastMessage(errorMessage, 'error');

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
      gender: '',
      // grade: '',
      // program: '',
      // fatherName: '',
      // motherName: '',
      // accessToWhatsApp: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      showFooter={false}
      modalTitle="New Students"
    >
      <Box sx={{ mt: 2 }}>
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
          sx={{ mb: 2 }}
        />
        {/* Email */}
        <TextField
          fullWidth
          size="small"
          label="Email"
          placeholder="Enter Email Id"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
          sx={{ mb: 2 }}
        />

        {/* Grade */}
        {/* <FormControl fullWidth size="small" required sx={{ mb: 2 }}>
          <InputLabel>Grade</InputLabel>
          <Select
            value={formData.grade}
            label="Grade"
            onChange={(e) => handleChange('grade', e.target.value)}
          >
            <MenuItem value="">
              <em>Select Grade</em>
            </MenuItem>
            <MenuItem value="grade1">Grade 1</MenuItem>
            <MenuItem value="grade2">Grade 2</MenuItem>
            <MenuItem value="grade3">Grade 3</MenuItem>
            <MenuItem value="grade4">Grade 4</MenuItem>
            <MenuItem value="grade5">Grade 5</MenuItem>
            <MenuItem value="grade6">Grade 6</MenuItem>
            <MenuItem value="grade7">Grade 7</MenuItem>
            <MenuItem value="grade8">Grade 8</MenuItem>
            <MenuItem value="grade9">Grade 9</MenuItem>
            <MenuItem value="grade10">Grade 10</MenuItem>
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
            <MenuItem value="regular">Regular Program</MenuItem>
            <MenuItem value="remedial">Remedial Program</MenuItem>
            <MenuItem value="advanced">Advanced Program</MenuItem>
          </Select>
        </FormControl> */}

        {/* Father's Name */}
        {/* <TextField
          fullWidth
          size="small"
          label="Father's Name"
          placeholder="Enter father's name"
          value={formData.fatherName}
          onChange={(e) => handleChange('fatherName', e.target.value)}
          sx={{ mb: 2 }}
        /> */}

        {/* Mother's Name */}
        {/* <TextField
          fullWidth
          size="small"
          label="Mother Name"
          placeholder="Enter mother's name"
          value={formData.motherName}
          onChange={(e) => handleChange('motherName', e.target.value)}
          sx={{ mb: 2 }}
        /> */}

        {/* Access To WhatsApp */}
        {/* <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
            Access To WhatsApp
          </FormLabel>
          <RadioGroup
            row
            value={formData.accessToWhatsApp}
            onChange={(e) => handleChange('accessToWhatsApp', e.target.value)}
          >
            <FormControlLabel
              value="yes"
              control={<Radio size="small" />}
              label="Yes"
            />
            <FormControlLabel
              value="no"
              control={<Radio size="small" />}
              label="No"
            />
          </RadioGroup>
        </FormControl> */}

        {/* Action Buttons */}
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}
        >
          <Button variant="outlined" onClick={handleCancel} disabled={loading}>
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
    </SimpleModal>
  );
};

export default AddStudentModal;

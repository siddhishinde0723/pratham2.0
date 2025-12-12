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
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  getCohortList,
  createCohort,
  assignClassToTeacher,
} from '@/services/CohortService/cohortService';
import { getCohortMemberList } from '@/services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import { userList } from '@/services/UserList';

// Time options for dropdown
const timeOptions = [
  '06:00 AM',
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

const CenterForm = ({ open, onClose, onSubmit, center }) => {
  const [formData, setFormData] = useState({
    schoolId: '',
    className: '',
    teacherId: '',
    fromTime: '09:00 AM',
    toTime: '04:00 PM',
    status: 'active',
    capacity: 30,
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // State for dynamic data
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  // Fetch clusters on component mount
  useEffect(() => {
    if (open) {
      fetchClusters();
      setIsEditing(!!center);
    }
  }, [open, center]);

  // Fetch schools when cluster is selected
  useEffect(() => {
    if (selectedCluster) {
      fetchSchools(selectedCluster);
    } else {
      setSchools([]);
      setFormData((prev) => ({ ...prev, schoolId: '' }));
    }
  }, [selectedCluster]);

  // Fetch classes when school is selected
  useEffect(() => {
    if (formData.schoolId) {
      fetchClasses(formData.schoolId);
      // Only fetch teachers if not editing an existing class
      if (!center?.cohortId) {
        fetchTeachersForSchool(formData.schoolId);
      }
    } else {
      setClasses([]);
      setTeachers([]);
      setFormData((prev) => ({ ...prev, teacherId: '' }));
    }
  }, [formData.schoolId, center]);

  // Load center data when editing
  useEffect(() => {
    if (center && open) {
      // Find the school ID from the center
      const schoolId = center.parentId || '';

      // Set editing mode
      setIsEditing(true);

      // Fetch schools and classes for this center
      if (schoolId) {
        fetchSchoolsAndCluster(schoolId);
        fetchClasses(schoolId);
        // For existing class, fetch teachers for edit (candidates from school - current class members)
        fetchTeachersForEdit(schoolId, center.cohortId, center.metadata?.teacherId);
      }

      // Map API data to form structure
      setFormData({
        schoolId: schoolId,
        className: center.name || '',
        teacherId: center.metadata?.teacherId || '',
        fromTime: center.metadata?.fromTime || '09:00 AM',
        toTime: center.metadata?.toTime || '04:00 PM',
        status: center.status || 'active',
        capacity: center.metadata?.capacity || 30,
        description: center.metadata?.description || '',
      });
    } else {
      // Reset form for new class
      setIsEditing(false);
      setFormData({
        schoolId: '',
        className: '',
        teacherId: '',
        fromTime: '09:00 AM',
        toTime: '04:00 PM',
        status: 'active',
        capacity: 30,
        description: '',
      });
      setSelectedCluster('');
      setSchools([]);
      setTeachers([]);
      setClasses([]);
    }
    setErrors({});
  }, [center, open]);

  // Function to fetch schools and determine cluster
  const fetchSchoolsAndCluster = async (schoolId) => {
    try {
      // First, fetch all clusters
      const clusterRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'CLUSTER',
          status: ['active'],
        },
      };

      const clusterResponse = await getCohortList(clusterRequestData);
      let allClusters = [];

      if (
        clusterResponse?.results?.cohortDetails &&
        Array.isArray(clusterResponse.results.cohortDetails)
      ) {
        allClusters = clusterResponse.results.cohortDetails;
      } else if (Array.isArray(clusterResponse)) {
        allClusters = clusterResponse;
      }
      setClusters(allClusters);

      // Now fetch schools for all clusters to find which cluster this school belongs to
      const schoolRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'SCHOOL',
          status: ['active'],
        },
      };

      const schoolResponse = await getCohortList(schoolRequestData);
      let allSchools = [];

      if (
        schoolResponse?.results?.cohortDetails &&
        Array.isArray(schoolResponse.results.cohortDetails)
      ) {
        allSchools = schoolResponse.results.cohortDetails;
      } else if (Array.isArray(schoolResponse)) {
        allSchools = schoolResponse;
      }

      // Find the current school
      const currentSchool = allSchools.find(
        (school) => school.cohortId === schoolId
      );
      if (currentSchool && currentSchool.parentId) {
        setSelectedCluster(currentSchool.parentId);
      }

      // Filter schools for the found cluster
      const filteredSchools = allSchools.filter((school) =>
        currentSchool?.parentId
          ? school.parentId === currentSchool.parentId
          : true
      );
      setSchools(filteredSchools);
    } catch (err) {
      console.error('Error fetching schools and cluster:', err);
      showToastMessage('Failed to fetch school information', 'error');
    }
  };

  // Fetch clusters
  const fetchClusters = async () => {
    try {
      const clusterRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'CLUSTER',
          status: ['active'],
        },
      };

      const response = await getCohortList(clusterRequestData);

      if (
        response?.results?.cohortDetails &&
        Array.isArray(response.results.cohortDetails)
      ) {
        setClusters(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setClusters(response);
      } else {
        setClusters([]);
      }
    } catch (err) {
      console.error('Error fetching clusters:', err);
      setClusters([]);
      showToastMessage('Failed to fetch clusters', 'error');
    }
  };

  // Fetch schools based on selected cluster
  const fetchSchools = async (clusterId) => {
    setLoadingSchools(true);
    try {
      const schoolRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'SCHOOL',
          status: ['active'],
          parentId: [clusterId],
        },
      };

      const response = await getCohortList(schoolRequestData);

      if (
        response?.results?.cohortDetails &&
        Array.isArray(response.results.cohortDetails)
      ) {
        setSchools(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setSchools(response);
      } else {
        setSchools([]);
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
      setSchools([]);
      showToastMessage('Failed to fetch schools', 'error');
    } finally {
      setLoadingSchools(false);
    }
  };

  // Fetch classes for selected school
  const fetchClasses = async (schoolId) => {
    setLoadingClasses(true);
    try {
      const classRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'COHORT',
          status: ['active'],
          parentId: [schoolId],
        },
      };

      const response = await getCohortList(classRequestData);

      if (
        response?.results?.cohortDetails &&
        Array.isArray(response.results.cohortDetails)
      ) {
        setClasses(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setClasses(response);
      } else {
        setClasses([]);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([]);
      showToastMessage('Failed to fetch classes', 'error');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch teachers for edit mode (Global Teachers/Learners - Class Members + Current Teacher)
  const fetchTeachersForEdit = useCallback(async (schoolId, classId, currentTeacherId) => {
    setLoadingTeachers(true);
    try {
      console.log('Fetching teachers for edit:', { schoolId, classId, currentTeacherId });

      // Step 1: Fetch all teachers/learners from userList
      let globalTeachers = [];
      try {
        const userListRequestData = {
          limit: 0,
          offset: 0,
          sort: ['firstName', 'asc'],
          filters: {
            role:'Teacher',
            // role: ['Teacher', 'Learner'],
            status: ['active'],
          },
        };
        const response = await userList(userListRequestData);
        if (response?.getUserDetails) {
           // Apply client-side filter for roles
           globalTeachers = response.getUserDetails.filter((user) => {
             const role = user.role?.toLowerCase();
             console.log('User Role:', role);
             return ["teacher", "learner"].includes(role);
           });
        } else if (Array.isArray(response)) {
           globalTeachers = response.filter((user) => {
           
             const role = user.role?.toLowerCase();
             return ["teacher", "learner"].includes(role);
           });
        }
      } catch (e) {
        console.error('Error fetching global teachers:', e);
      }
      console.log('Global Teachers:', globalTeachers);
      // Step 2: Fetch teachers currently in the class (To Exclude)
      let classMembers = new Set();
      try {
          const classRequestData = {
          limit: 0,
          offset: 0,
          filters: {
            cohortId: classId,
            status: ['active'],
          },
        };
        // const classResponse = await getCohortMemberList(classRequestData);
        //  if (classResponse?.userDetails) {
        //    classResponse.userDetails.forEach(u => classMembers.add(u.userId));
        // }
      } catch (e) {
          console.error('Error fetching class members:', e);
      }

      // Step 3: Filter and Map
      const teachersData = globalTeachers
        .map((teacher) => ({
            id: teacher.userId,
            name: `${teacher.firstName} ${teacher.lastName}`.trim(),
            email: teacher.email || '',
            userId: teacher.userId,
            username: teacher.username || '',
            firstName: teacher.firstName || '',
            lastName: teacher.lastName || '',
            status: teacher.status || 'active',
            role: teacher.role,
            cohortId: '', 
        }));
      
      setTeachers(teachersData);

    } catch (err) {
      console.error('Error in fetchTeachersForEdit:', err);
      showToastMessage('Failed to fetch teachers', 'error');
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  // Fetch all teachers for a school (when creating new class)
  const fetchTeachersForSchool = useCallback(async (schoolId) => {
    setLoadingTeachers(true);
    try {
      // First, let's try to fetch all teachers for the school
      const teacherRequestData = {
        limit: 0,
        offset: 0,
        sort: ['firstName', 'asc'],
        filters: {
          role: 'Teacher',
          // Use the school cohortId to fetch teachers assigned to the school
          cohortId: schoolId,
          status: ['active'],
        },
      };

      console.log('Fetching teachers for school:', schoolId);
      console.log('Teacher request data:', teacherRequestData);

      const response = await getCohortMemberList(teacherRequestData);

      console.log('Teachers response:', response);

      if (response && typeof response === 'object') {
        let teachersData = [];

        if (response.userDetails) {
          teachersData = response.userDetails.map((teacher) => ({
            id: teacher.userId,
            name: `${teacher.firstName} ${teacher.lastName}`,
            email: teacher.email || '',
            userId: teacher.userId,
            username: teacher.username,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            status: teacher.status,
            role: teacher.role,
            cohortId: teacher.cohortId,
          }));
        } else if (Array.isArray(response)) {
          teachersData = response.map((teacher) => ({
            id: teacher.userId,
            name: `${teacher.firstName} ${teacher.lastName}`,
            email: teacher.email || '',
            userId: teacher.userId,
            username: teacher.username,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            status: teacher.status,
            role: teacher.role,
            cohortId: teacher.cohortId,
          }));
        }

        // If no teachers found with school cohortId, try to fetch teachers from all classes in the school
        if (teachersData.length === 0) {
          console.log('No teachers found for school, fetching from classes...');
          await fetchTeachersFromAllClasses(schoolId);
        } else {
          setTeachers(teachersData);
        }
      } else {
        console.log('No valid response, fetching from classes...');
        await fetchTeachersFromAllClasses(schoolId);
      }
    } catch (err) {
      console.error('Error fetching school teachers:', err);
      // Try alternative approach
      await fetchTeachersFromAllClasses(schoolId);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  // Alternative: Fetch teachers from all classes in the school
  const fetchTeachersFromAllClasses = useCallback(async (schoolId) => {
    try {
      // First get all classes in this school
      const classRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'COHORT',
          status: ['active'],
          parentId: [schoolId],
        },
      };

      const classesResponse = await getCohortList(classRequestData);
      let allClasses = [];

      if (
        classesResponse?.results?.cohortDetails &&
        Array.isArray(classesResponse.results.cohortDetails)
      ) {
        allClasses = classesResponse.results.cohortDetails;
      } else if (Array.isArray(classesResponse)) {
        allClasses = classesResponse;
      }

      if (allClasses.length === 0) {
        console.log('No classes found in this school');
        setTeachers([]);
        return;
      }

      // Get unique teachers from all classes
      const allTeachers = [];
      const processedTeacherIds = new Set();

      // Fetch teachers from each class
      for (const classItem of allClasses) {
        try {
          const teacherRequestData = {
            limit: 0,
            offset: 0,
            sort: ['firstName', 'asc'],
            filters: {
              role: 'Teacher',
              cohortId: classItem.cohortId,
              status: ['active'],
            },
          };

          const response = await getCohortMemberList(teacherRequestData);

          if (response && response.userDetails) {
            for (const teacher of response.userDetails) {
              if (!processedTeacherIds.has(teacher.userId)) {
                allTeachers.push({
                  id: teacher.userId,
                  name: `${teacher.firstName} ${teacher.lastName}`,
                  email: teacher.email || '',
                  userId: teacher.userId,
                  username: teacher.username,
                  firstName: teacher.firstName,
                  lastName: teacher.lastName,
                  status: teacher.status,
                  role: teacher.role,
                  cohortId: teacher.cohortId,
                  sourceClass: classItem.name,
                  sourceClassId: classItem.cohortId,
                });
                processedTeacherIds.add(teacher.userId);
              }
            }
          }
        } catch (err) {
          console.error(
            `Error fetching teachers from class ${classItem.name}:`,
            err
          );
        }
      }

      console.log(
        `Found ${allTeachers.length} unique teachers from all classes`
      );
      setTeachers(allTeachers);
    } catch (err) {
      console.error('Error fetching teachers from classes:', err);
      setTeachers([]);
      showToastMessage('Failed to fetch teachers', 'error');
    }
  }, []);

  // Helper function to check if class name already exists
  const isClassNameTaken = (className) => {
    if (!className.trim()) return false;
    return classes.some(
      (cls) =>
        cls.name.toLowerCase() === className.toLowerCase() &&
        cls.cohortId !== (center?.cohortId || '')
    );
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.schoolId.trim())
      newErrors.schoolId = 'School selection is required';
    if (!formData.className.trim())
      newErrors.className = 'Class name is required';

    // Check if class name already exists
    if (isClassNameTaken(formData.className)) {
      newErrors.className = 'Class name already exists for this school';
    }

    if (!formData.teacherId.trim())
      newErrors.teacherId = 'Teacher selection is required';

    // Time validation
    if (!formData.fromTime.trim()) newErrors.fromTime = 'From time is required';
    if (!formData.toTime.trim()) newErrors.toTime = 'To time is required';

    // Ensure toTime is after fromTime
    const fromIndex = timeOptions.indexOf(formData.fromTime);
    const toIndex = timeOptions.indexOf(formData.toTime);
    if (fromIndex >= toIndex) {
      newErrors.toTime = 'To time must be after from time';
    }

    // Capacity validation
    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || '' : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleClusterChange = (e) => {
    const clusterId = e.target.value;
    setSelectedCluster(clusterId);
    setFormData((prev) => ({
      ...prev,
      schoolId: '',
      teacherId: '',
      className: '',
    }));
    setClasses([]);
  };

  const handleSchoolChange = (schoolId) => {
    setFormData((prev) => ({
      ...prev,
      schoolId,
      teacherId: '',
      className: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API
      const selectedSchool = schools.find(
        (s) => s.cohortId === formData.schoolId
      );
      const selectedTeacher = teachers.find((t) => t.id === formData.teacherId);

      const classData = {
        name: formData.className,
        parentId: formData.schoolId,
        type: 'COHORT',
        status: formData.status,
        metadata: {
          schoolName: selectedSchool?.name,
          teacherId: formData.teacherId,
          teacherName: selectedTeacher?.name,
          teacherEmail: selectedTeacher?.email,
          fromTime: formData.fromTime,
          toTime: formData.toTime,
          capacity: formData.capacity,
          description: formData.description,
        },
      };

      let response;
      let resultData;

      if (isEditing) {
        // EDIT MODE: Update existing class
        console.log('✏️ Editing class:', center.cohortId);

        // Step 1: Update class details
        classData.cohortId = center.cohortId;

        // Step 2: Assign teacher to class (if teacher has changed)
        if (center.metadata?.teacherId !== formData.teacherId) {
          console.log('👨‍🏫 Teacher changed, calling assignClassToTeacher API');

          const assignResponse = await assignClassToTeacher({
            userId: [formData.teacherId],
            cohortId: [center.cohortId],
          });

          console.log('Assign teacher response:', assignResponse);

          if (
            assignResponse?.responseCode === 200 ||
            assignResponse?.responseCode === 201
          ) {
            console.log('✅ Teacher assigned successfully');
          } else {
            console.warn('⚠️ Teacher assignment failed, but class was updated');
          }
        }

        // Prepare data for parent callback
        // resultData = updateResponse.data || {
        //   ...classData,
        //   cohortId: center.cohortId,
        //   parentId: center.parentId,
        //   createdAt: center.createdAt,
        //   updatedAt: new Date().toISOString(),
        // };
      } else {
        // CREATE MODE: Create new class
        console.log('🆕 Creating new class');

        response = await createCohort(classData);
        console.log('Create class response:', response);

        if (response?.responseCode === 201) {
          console.log('✅ Class created successfully');

          // Prepare data for parent callback
          resultData = response.data || {
            ...classData,
            cohortId: response.result?.cohortId || `temp-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // For new classes, assign teacher immediately
        } else if (response?.responseCode === 409) {
          throw new Error(
            'Class name already exists. Please use a different name.'
          );
        } else {
          throw new Error(response?.message || 'Failed to create class');
        }
      }

      // Call onSubmit callback with the formatted data
      if (onSubmit && resultData) {
        console.log('📢 Calling parent onSubmit with result data');
        onSubmit(resultData);
      }

      setSuccessMessage(
        isEditing
          ? 'Class updated successfully!'
          : 'Class created successfully!'
      );

      // Close after success
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1500);
    } catch (error) {
      console.error('Error saving class:', error);

      let errorMsg;
      if (error.message.includes('already exists')) {
        errorMsg = 'Class name already exists. Please use a different name.';
        setErrors((prev) => ({ ...prev, className: errorMsg }));
      } else if (error.message.includes('Network Error')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else {
        errorMsg = error.message || 'Failed to save class. Please try again.';
      }

      setErrorMessage(errorMsg);
      showToastMessage(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleCloseSnackbar = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Get selected school name for display
  const getSelectedSchoolName = () => {
    const school = schools.find((s) => s.cohortId === formData.schoolId);
    return school ? `${school.name}` : '';
  };

  // Get selected teacher name for display
  const getSelectedTeacherName = () => {
    const teacher = teachers.find((t) => t.id === formData.teacherId);
    if (teacher) {
      const sourceInfo = teacher.sourceClass
        ? ` (from ${teacher.sourceClass})`
        : '';
      return `${teacher.name}${sourceInfo} (${
        teacher.email || teacher.username
      })`;
    }
    return '';
  };

  // Get class count for selected school
  const getClassCount = () => {
    return classes.length;
  };

  // Get teacher selection label based on mode
  const getTeacherLabel = () => {
    if (isEditing) {
      return 'Class Teacher (Assigned to this class)';
    }
    return 'Select Teacher *';
  };

  // Get teacher helper text
  const getTeacherHelperText = () => {
    if (loadingTeachers) return 'Loading teachers...';
    if (teachers.length === 0) return 'No teachers available';

    if (isEditing) {
      return `${teachers.length} teacher(s) assigned to this class`;
    } else {
      const activeTeachers = teachers.filter((t) => t.status === 'active');
      const uniqueClasses = new Set(teachers.map((t) => t.sourceClassId)).size;
      return `${activeTeachers.length} active teacher(s) found from ${uniqueClasses} class(es)`;
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '70vh',
            maxHeight: '90vh',
            width: '50%',
            maxWidth: '500px',
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            {center ? 'Edit Class' : 'Add New Class'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {center
              ? 'Update class details'
              : 'Fill in the details to create a new class'}
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              {/* Cluster Selection */}
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={!!errors.clusterId}
                >
                  <InputLabel id="cluster-label">Select Cluster *</InputLabel>
                  <Select
                    labelId="cluster-label"
                    id="clusterId"
                    value={selectedCluster}
                    onChange={handleClusterChange}
                    label="Select Cluster *"
                    disabled={loading || loadingSchools}
                  >
                    <MenuItem value="">
                      <em>Select a cluster</em>
                    </MenuItem>
                    {clusters.map((cluster) => (
                      <MenuItem key={cluster.cohortId} value={cluster.cohortId}>
                        {cluster.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.clusterId && (
                    <FormHelperText>{errors.clusterId}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* School Selection */}
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={!!errors.schoolId}
                >
                  <InputLabel id="school-label">Select School *</InputLabel>
                  <Select
                    labelId="school-label"
                    id="schoolId"
                    name="schoolId"
                    value={formData.schoolId}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    label="Select School *"
                    disabled={loading || !selectedCluster || loadingSchools}
                  >
                    <MenuItem value="">
                      <em>Select a school</em>
                    </MenuItem>
                    {loadingSchools ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          Loading schools...
                        </Typography>
                      </MenuItem>
                    ) : (
                      schools.map((school) => (
                        <MenuItem key={school.cohortId} value={school.cohortId}>
                          {school.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.schoolId && (
                    <FormHelperText>{errors.schoolId}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Existing Classes Display */}
              {formData.schoolId && classes.length > 0 && (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Existing Classes ({getClassCount()})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {loadingClasses ? (
                        <CircularProgress size={20} />
                      ) : (
                        classes.map((cls) => (
                          <Chip
                            key={cls.cohortId}
                            label={cls.name}
                            size="small"
                            color={
                              center?.cohortId === cls.cohortId
                                ? 'primary'
                                : 'default'
                            }
                            variant={
                              center?.cohortId === cls.cohortId
                                ? 'filled'
                                : 'outlined'
                            }
                            sx={{ m: 0.5 }}
                          />
                        ))
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}

              {/* Class Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="className"
                  name="className"
                  label="Class Name *"
                  placeholder="e.g., Class 1A, Grade 5B, etc."
                  value={formData.className}
                  onChange={handleChange}
                  error={!!errors.className}
                  helperText={
                    errors.className || 'Enter a unique name for this class'
                  }
                  margin="normal"
                  disabled={loading || !formData.schoolId}
                  required
                  InputProps={{
                    endAdornment: formData.className && (
                      <Chip
                        label={
                          isClassNameTaken(formData.className)
                            ? 'Taken'
                            : 'Available'
                        }
                        color={
                          isClassNameTaken(formData.className)
                            ? 'error'
                            : 'success'
                        }
                        size="small"
                      />
                    ),
                  }}
                />
              </Grid>

              {/* Teacher Selection */}
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={!!errors.teacherId}
                >
                  <InputLabel id="teacher-label">
                    {getTeacherLabel()}
                  </InputLabel>
                  <Select
                    labelId="teacher-label"
                    id="teacherId"
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={(e) =>
                      handleSelectChange('teacherId', e.target.value)
                    }
                    label={getTeacherLabel()}
                    disabled={loading || !formData.schoolId || loadingTeachers}
                  >
                    <MenuItem value="">
                      <em>Select a teacher</em>
                    </MenuItem>
                    {loadingTeachers ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          Loading teachers...
                        </Typography>
                      </MenuItem>
                    ) : teachers.length === 0 ? (
                      <MenuItem disabled>
                        {isEditing
                          ? 'No teachers assigned to this class'
                          : 'No teachers available for this school'}
                      </MenuItem>
                    ) : (
                      teachers.map((teacher) => (
                        <MenuItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                          {teacher.sourceClass && ` - ${teacher.sourceClass}`}
                          {teacher.status !== 'active' &&
                            ` - ${teacher.status}`}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.teacherId && (
                    <FormHelperText>{errors.teacherId}</FormHelperText>
                  )}
                  <FormHelperText>{getTeacherHelperText()}</FormHelperText>
                </FormControl>
              </Grid>

              {/* Time Selection - Side by side */}
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={!!errors.fromTime}
                >
                  <InputLabel id="from-time-label">From Time *</InputLabel>
                  <Select
                    labelId="from-time-label"
                    id="fromTime"
                    name="fromTime"
                    value={formData.fromTime}
                    onChange={(e) =>
                      handleSelectChange('fromTime', e.target.value)
                    }
                    label="From Time *"
                    disabled={loading}
                    startAdornment={
                      <TimeIcon fontSize="small" sx={{ mr: 1 }} />
                    }
                  >
                    {timeOptions.map((time) => (
                      <MenuItem key={`from-${time}`} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.fromTime && (
                    <FormHelperText>{errors.fromTime}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" error={!!errors.toTime}>
                  <InputLabel id="to-time-label">To Time *</InputLabel>
                  <Select
                    labelId="to-time-label"
                    id="toTime"
                    name="toTime"
                    value={formData.toTime}
                    onChange={(e) =>
                      handleSelectChange('toTime', e.target.value)
                    }
                    label="To Time *"
                    disabled={loading}
                    startAdornment={
                      <TimeIcon fontSize="small" sx={{ mr: 1 }} />
                    }
                  >
                    {timeOptions.map((time) => (
                      <MenuItem key={`to-${time}`} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.toTime && (
                    <FormHelperText>{errors.toTime}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Class Duration Display */}
              {/* <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    Class Duration:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formData.fromTime} - {formData.toTime}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {(() => {
                      const fromIndex = timeOptions.indexOf(formData.fromTime);
                      const toIndex = timeOptions.indexOf(formData.toTime);
                      return toIndex > fromIndex
                        ? `${toIndex - fromIndex} hours`
                        : 'Invalid time range';
                    })()}
                  </Typography>
                </Box>
              </Grid> */}

              {/* Additional Information */}
              {/* <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={(e) =>
                      handleSelectChange('status', e.target.value)
                    }
                    label="Status"
                    disabled={loading}
                  >
                    {statusOptions.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="capacity"
                  name="capacity"
                  label="Student Capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleChange}
                  error={!!errors.capacity}
                  helperText={errors.capacity || 'Maximum number of students'}
                  margin="normal"
                  disabled={loading}
                  InputProps={{ inputProps: { min: 1, max: 100 } }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description (Optional)"
                  placeholder="Add any additional notes about this class..."
                  value={formData.description}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={2}
                  disabled={loading}
                />
              </Grid> */}

              {/* <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'primary.light',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    opacity: 0.9,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    color="primary.contrastText"
                    gutterBottom
                  >
                    Class Summary
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>Mode:</strong>{' '}
                    {isEditing ? 'Editing' : 'Creating New'}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>Cluster:</strong>{' '}
                    {clusters.find((c) => c.cohortId === selectedCluster)
                      ?.name || 'Not selected'}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>School:</strong>{' '}
                    {getSelectedSchoolName() || 'Not selected'}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>Existing Classes:</strong> {getClassCount()}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>Class:</strong>{' '}
                    {formData.className || 'Not entered'}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>Teacher:</strong>{' '}
                    {getSelectedTeacherName() || 'Not selected'}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    <strong>Timing:</strong> {formData.fromTime} to{' '}
                    {formData.toTime}
                  </Typography>
                </Box>
              </Grid> */}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={onClose}
              startIcon={<CancelIcon />}
              disabled={loading}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              disabled={
                loading ||
                !formData.schoolId ||
                !formData.teacherId ||
                isClassNameTaken(formData.className)
              }
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Saving...' : center ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          icon={<ErrorIcon fontSize="inherit" />}
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CenterForm;

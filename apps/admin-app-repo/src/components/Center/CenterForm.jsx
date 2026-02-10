/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @nx/enforce-module-boundaries */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
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
  InputAdornment,
  ListSubheader,
  // Autocomplete, // Commented out - search functionality removed
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  getCohortList,
  createCohort,
  assignClassToTeacher,
  bulkCreateCohortMembers,
} from '@/services/CohortService/cohortService';
import { post, put } from '@/services/RestClient';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { getCohortMemberList } from '@/services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import { userList } from '@/services/UserList';
import TenantService from '@/services/TenantService';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

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

const CenterForm = ({ open, onClose, onSubmit, center, isCenter = false, parentName = '' }) => {
  const [formData, setFormData] = useState({
    schoolId: '',
    className: '',
    teacherId: '',
    fromTime: '',
    toTime: '',
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
  const [schoolSearchTerm, setSchoolSearchTerm] = useState(''); // New state for school search
  
  // Search state for teachers
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherSelectWidth, setTeacherSelectWidth] = useState(null);
  const [assignedTeacherMembershipId, setAssignedTeacherMembershipId] = useState(null);
  const [assignedTeacherData, setAssignedTeacherData] = useState(null);
  const [timeSlotTouched, setTimeSlotTouched] = useState(false); // Track if user has interacted with time pickers

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  // Fetch schools and teachers on component mount
  useEffect(() => {
    if (open) {
      // fetchClusters(); // Commented out - cluster dropdown removed
      fetchAllSchools(); // Fetch all schools independently
      fetchAllTeachers(''); // Fetch teachers independently when dialog opens
      setIsEditing(!!center);
    }
  }, [open, center]);

  // Fetch teachers when search term changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        fetchAllTeachers(teacherSearchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [teacherSearchTerm, open]);

  // Fetch classes when school is selected
  useEffect(() => {
    if (formData.schoolId) {
      fetchClasses(formData.schoolId);
    } else {
      setClasses([]);
      setFormData((prev) => ({ ...prev, teacherId: '' }));
    }
  }, [formData.schoolId, center]);

  // Fetch assigned teacher when editing using cohortmember/list API
  const fetchAssignedTeacher = useCallback(async (cohortId, teacherId, centerMetadata) => {
    if (!cohortId) return;

    try {
      // Call cohortmember/list API to get teacher data and cohortMembershipId
      const teacherRequestData = {
        limit: 300,
        offset: 0,
        filters: {
          cohortId: cohortId,
          role: 'Teacher',
        },
        sort: ['name', 'asc'],
      };

      const response = await getCohortMemberList(teacherRequestData);
      console.log('CohortMember list response:', response);

      if (response && response.userDetails) {
        // Filter for active teachers only (role: "Teacher" and status: "active")
        const activeTeachers = response.userDetails.filter(
          (member) => member.role === 'Teacher' && member.status === 'active'
        );

        // If teacherId is provided, try to find that specific teacher
        // Otherwise, get the first active teacher
        let assignedTeacher = null;
        
        if (teacherId) {
          // First try to find the specified teacher if active
          assignedTeacher = activeTeachers.find(
            (teacher) => teacher.userId === teacherId
          );
          
          // If specified teacher is not active, get first active teacher instead
          if (!assignedTeacher && activeTeachers.length > 0) {
            assignedTeacher = activeTeachers[0];
            console.log('Specified teacher not active, using first active teacher:', assignedTeacher.userId);
          }
        } else {
          // No teacherId specified, get first active teacher
          if (activeTeachers.length > 0) {
            assignedTeacher = activeTeachers[0];
            console.log('No teacher specified, using first active teacher:', assignedTeacher.userId);
          }
        }

        if (assignedTeacher) {
          // Store cohortMembershipId for slot updates
          const membershipId = assignedTeacher.cohortMembershipId || assignedTeacher.id || assignedTeacher.membershipId;
          if (membershipId) {
            setAssignedTeacherMembershipId(membershipId);
            console.log('Stored cohortMembershipId:', membershipId);
          }

          // Extract slot information from customField
          const slotFieldId = 'f3658b23-1394-48a9-afc5-7589874465af';
          let slotValue = null;
          if (assignedTeacher.customField && Array.isArray(assignedTeacher.customField)) {
            const slotField = assignedTeacher.customField.find(
              (field) => field.fieldId === slotFieldId
            );
            if (slotField && slotField.selectedValues && slotField.selectedValues.length > 0) {
              // Get first slot value and ensure it's a clean string
              let rawSlotValue = slotField.selectedValues[0];
              // Handle if it's already an array (shouldn't be, but just in case)
              if (Array.isArray(rawSlotValue)) {
                rawSlotValue = rawSlotValue[0] || '';
              }
              // Remove any extra encoding/stringification
              slotValue = String(rawSlotValue).replace(/^["'[\]]+|["'[\]]+$/g, '').trim();
              console.log('📥 Extracted slot value from API:', { raw: slotField.selectedValues[0], cleaned: slotValue });
            }
          }

          // Store teacher data from API for display
          const teacherData = {
            id: assignedTeacher.userId,
            name: `${assignedTeacher.firstName} ${assignedTeacher.lastName}`.trim(),
            email: assignedTeacher.email || '',
            userId: assignedTeacher.userId,
            username: assignedTeacher.username || '',
            firstName: assignedTeacher.firstName || '',
            lastName: assignedTeacher.lastName || '',
            status: assignedTeacher.status || 'active',
            role: assignedTeacher.role,
            cohortId: assignedTeacher.cohortId || '',
            cohortMembershipId: membershipId,
            slot: slotValue, // Store slot value
          };

          // Set assignedTeacherData (always active since we filtered)
          setAssignedTeacherData(teacherData);

          // Update formData with the active teacher's ID and slot
          setFormData((prev) => {
            const updated = {
              ...prev,
              teacherId: assignedTeacher.userId,
            };
            
            // Update slot times if slot value exists
            if (slotValue) {
              // Parse slot value like "04:00 PM - 05:00 PM"
              // Handle both string and array formats
              let slotString = slotValue;
              if (Array.isArray(slotValue)) {
                slotString = slotValue[0] || '';
              }
              // Remove any extra quotes or encoding
              slotString = String(slotString).replace(/^["'[\]]+|["'[\]]+$/g, '').trim();
              
              const slotParts = slotString.split(' - ');
              if (slotParts.length === 2) {
                updated.fromTime = slotParts[0].trim();
                updated.toTime = slotParts[1].trim();
              }
            }
            
            return updated;
          });

          // Add to teachers list if not already present
          setTeachers((prevTeachers) => {
            const exists = prevTeachers.some((t) => t.id === assignedTeacher.userId);
            if (!exists) {
              return [teacherData, ...prevTeachers];
            }
            return prevTeachers;
          });
          
          return; // Success, exit early
        } else {
          // No active teacher found, clear assignedTeacherData to show dropdown
          console.log('No active teacher found in cohort');
          setAssignedTeacherData(null);
          setAssignedTeacherMembershipId(null);
        }
      } else {
        // No teachers found, show dropdown
        console.log('No teachers found in cohort');
        setAssignedTeacherData(null);
        setAssignedTeacherMembershipId(null);
      }
    } catch (err) {
      console.error('Error fetching assigned teacher:', err);
      // On error, clear data to show dropdown
      setAssignedTeacherData(null);
      setAssignedTeacherMembershipId(null);
    }
  }, []);

  // Parse metadata if it's a string
  const parseMetadata = (metadata) => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch (e) {
        console.error('Error parsing metadata:', e);
        return {};
      }
    }
    return metadata;
  };

  // Load center data when editing
  useEffect(() => {
    if (center && open) {
      // Find the school ID from the center
      const schoolId = center.parentId || '';
      const metadata = parseMetadata(center.metadata);
      const teacherId = metadata?.teacherId || '';

      // Set editing mode
      setIsEditing(true);

      // Fetch schools and classes for this center
      if (schoolId) {
        fetchSchoolsAndCluster(schoolId);
        fetchClasses(schoolId);
      }

      // Map API data to form structure (without teacher and slot from metadata)
      setFormData({
        schoolId: schoolId,
        className: center.name || '',
        teacherId: '', // Will be set from API response
        fromTime: '09:00 AM', // Will be set from API response
        toTime: '04:00 PM', // Will be set from API response
        status: center.status || 'active',
        capacity: metadata?.capacity || 30,
        description: metadata?.description || '',
      });
      setTimeSlotTouched(false); // Reset time slot touched state

      // Fetch assigned teacher from API (will get active teacher and slot)
      fetchAssignedTeacher(center.cohortId, teacherId, metadata);
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
      setTimeSlotTouched(false); // Reset time slot touched state
      setSelectedCluster('');
      setSchools([]);
      setTeachers([]);
      setClasses([]);
      setTeacherSearchTerm('');
      setAssignedTeacherMembershipId(null);
      setAssignedTeacherData(null);
    }
    setErrors({});
  }, [center, open, fetchAssignedTeacher]);

  // Function to fetch all schools (for edit mode)
  const fetchSchoolsAndCluster = async (schoolId) => {
    try {
      // Fetch all schools without cluster filter
      const schoolRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: isCenter ? 'CLUSTER' : 'SCHOOL',
          status: ['active'],
          // parentId removed - fetch all schools
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

      setSchools(allSchools);
    } catch (err) {
      console.error('Error fetching schools:', err);
      showToastMessage(`Failed to fetch ${isCenter ? 'cluster' : 'school'} information`, 'error');
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

  // Fetch all schools (without cluster filter)
  const fetchAllSchools = async () => {
    setLoadingSchools(true);
    try {
      const schoolRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: isCenter ? 'CLUSTER' : 'SCHOOL',
          status: ['active'],
          // parentId removed - fetch all schools
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
      showToastMessage(`Failed to fetch ${isCenter ? 'clusters' : 'schools'}`, 'error');
    } finally {
      setLoadingSchools(false);
    }
  };

  // Fetch centers/classes for selected parent
  const fetchClasses = async (parentId) => {
    setLoadingClasses(true);
    try {
      const classRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: isCenter ? 'SCHOOL' : 'COHORT',
          status: ['active'],
          parentId: [parentId],
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
      console.error(`Error fetching ${isCenter ? 'centers' : 'classes'}:`, err);
      setClasses([]);
      showToastMessage(`Failed to fetch ${isCenter ? 'centers' : 'classes'}`, 'error');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch all teachers independently (with search support)
  const fetchAllTeachers = useCallback(async (searchTerm = '') => {
    setLoadingTeachers(true);
    try {
      const tenantId = TenantService.getTenantId();
      const baseFilters = {
        role: 'Teacher',
        tenantId: tenantId,
      };

      // Add search filter if search term is provided
      const filters = searchTerm
        ? {
            ...baseFilters,
            firstName: searchTerm, // Server-side search by firstName
          }
        : baseFilters;

      const response = await userList({
        limit: 1000, // Large limit to fetch all teachers
          offset: 0,
        sort: ['createdAt', 'desc'],
        filters: filters,
      });

      console.log('Teachers response:', response);

      let teachersData = [];
      
      if (response?.getUserDetails) {
        teachersData = response.getUserDetails.map((teacher) => ({
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
      } else if (Array.isArray(response)) {
        teachersData = response.map((teacher) => ({
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
      }

      // If search term is provided and no results from firstName, try filtering by username
      if (searchTerm && teachersData.length === 0) {
        const usernameResponse = await userList({
          limit: 1000,
        offset: 0,
          sort: ['createdAt', 'desc'],
        filters: {
            ...baseFilters,
            username: searchTerm,
          },
        });

        if (usernameResponse?.getUserDetails) {
          teachersData = usernameResponse.getUserDetails.map((teacher) => ({
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
        } else if (Array.isArray(usernameResponse)) {
          teachersData = usernameResponse.map((teacher) => ({
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
        }
      }

      // Client-side filtering if server-side search didn't return results
      if (searchTerm && teachersData.length > 0) {
        const term = searchTerm.toLowerCase();
        teachersData = teachersData.filter(
          (teacher) =>
            (teacher.firstName && teacher.firstName.toLowerCase().includes(term)) ||
            (teacher.lastName && teacher.lastName.toLowerCase().includes(term)) ||
            (teacher.username && teacher.username.toLowerCase().includes(term)) ||
            (teacher.email && teacher.email.toLowerCase().includes(term))
        );
      }

      setTeachers(teachersData);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setTeachers([]);
      showToastMessage('Failed to fetch teachers', 'error');
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  // Debounced search handler - commented out
  // const debouncedSearch = useMemo(
  //   () =>
  //     debounce((value) => {
  //       setTeacherSearchTerm(value);
  //     }, 400),
  //   []
  // );

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

    // if (!formData.teacherId.trim())
    //   newErrors.teacherId = 'Teacher selection is required';

    // Time validation
    if (!formData.fromTime.trim()) newErrors.fromTime = 'From time is required';
    if (!formData.toTime.trim()) newErrors.toTime = 'To time is required';

    // Ensure toTime is after fromTime
    if (formData.fromTime && formData.toTime) {
      const from = dayjs(formData.fromTime, 'hh:mm A');
      const to = dayjs(formData.toTime, 'hh:mm A');
      
      if (from.isValid() && to.isValid() && !to.isAfter(from)) {
        newErrors.toTime = 'To time must be after from time';
      }
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

  // Cluster change handler - commented out as cluster dropdown is removed
  // const handleClusterChange = (e) => {
  //   const clusterId = e.target.value;
  //   setSelectedCluster(clusterId);
  //   setFormData((prev) => ({
  //     ...prev,
  //     schoolId: '',
  //     teacherId: '',
  //     className: '',
  //   }));
  //   setClasses([]);
  // };

  const handleSchoolChange = (schoolId) => {
    setFormData((prev) => ({
      ...prev,
      schoolId,
      teacherId: '',
      className: '',
    }));
  };

  const isSubmittingRef = useRef(false);
  const teacherSelectRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;

    if (!validateForm()) {
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    // Initialize slot update tracking (for CREATE MODE only)
    // Declared here so it's accessible when setting success message
    let slotUpdateSuccess = true;

    setLoading(true);
    try {
      // Prepare data for API
      const selectedSchool = schools.find(
        (s) => s.cohortId === formData.schoolId
      );
      const selectedTeacher = teachers.find((t) => t.id === formData.teacherId);

      const classData = {
        // Preserve the exact class name as entered (trimmed but original casing)
        name: (formData.className || '').trim(),
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

        // Parse metadata to get original values
        const originalMetadata = parseMetadata(center.metadata);
        const originalFromTime = originalMetadata?.fromTime || '09:00 AM';
        const originalToTime = originalMetadata?.toTime || '04:00 PM';
        // Use assignedTeacherData.id if available (from API), otherwise fallback to metadata
        // This ensures we compare with the actual active teacher, not just what's in metadata
        const originalTeacherId = assignedTeacherData?.id || assignedTeacherData?.userId || originalMetadata?.teacherId || '';

        // Step 2: Handle teacher reassignment (if teacher has changed)
        // Check if teacher actually changed (comparing IDs)
        // Trigger if there was an original teacher and the new ID is different (including if it's now empty)
        const teacherChanged = originalTeacherId && originalTeacherId !== formData.teacherId;
        
        console.log('🔍 Teacher change check:', {
          originalTeacherId,
          newTeacherId: formData.teacherId,
          teacherChanged,
          assignedTeacherMembershipId,
          assignedTeacherData: assignedTeacherData?.id
        });
        
        if (teacherChanged) {
          console.log('👨‍🏫 Teacher changed, reassigning teacher');
          console.log('Original teacher ID:', originalTeacherId);
          console.log('New teacher ID:', formData.teacherId || 'None');
          console.log('Stored membershipId:', assignedTeacherMembershipId);
          
          try {
            // Step 2a: Archive the old teacher if one exists
            let oldMembershipId = assignedTeacherMembershipId;
            
            // If membershipId is not stored, fetch it from API
            if (!oldMembershipId && originalTeacherId) {
              console.log('📡 Fetching old teacher membershipId from API');
              try {
                const teacherRequestData = {
                  limit: 300,
                  offset: 0,
                  filters: {
                    cohortId: center.cohortId,
                    role: 'Teacher',
                    // We don't filter by status here to find the membership even if it's already in a different state
                  },
                  sort: ['name', 'asc'],
                };

                const memberResponse = await getCohortMemberList(teacherRequestData);

                if (memberResponse && memberResponse.userDetails) {
                  // Find the teacher's record - prefer an active one if multiple exist
                  const oldTeacher = memberResponse.userDetails.find(
                    (member) => member.userId === originalTeacherId && member.status === 'active'
                  ) || memberResponse.userDetails.find(
                    (member) => member.userId === originalTeacherId
                  );
                  
                  if (oldTeacher) {
                    oldMembershipId = oldTeacher.cohortMembershipId || oldTeacher.id || oldTeacher.membershipId;
                    console.log('Found old teacher membershipId:', oldMembershipId);
                  }
                }
              } catch (fetchError) {
                console.error('Failed to fetch old teacher membership:', fetchError);
              }
            }
            
            if (originalTeacherId && oldMembershipId) {
              console.log('📦 Archiving old teacher:', originalTeacherId, 'MembershipId:', oldMembershipId);
              
              try {
                await put(
                  API_ENDPOINTS.cohortMemberUpdate(oldMembershipId),
                  {
                    status: 'archived',
                  }
                );
                console.log('✅ Old teacher archived successfully');
              } catch (archiveError) {
                console.error('❌ Failed to archive old teacher:', archiveError);
                throw new Error('Failed to remove previous teacher. Please try again.');
              }
            } else {
              console.warn('⚠️ Cannot archive old teacher - missing teacherId or membershipId');
            }

            // Step 2b: Assign new teacher using bulkCreate
            if (formData.teacherId) {
              console.log('➕ Assigning new teacher via bulkCreate:', formData.teacherId);
              
              const bulkCreateResponse = await post(
                API_ENDPOINTS.cohortMemberBulkCreate,
                {
                  userId: [formData.teacherId],
                  cohortId: [center.cohortId],
                }
              );
              console.log('BulkCreate response:', bulkCreateResponse);

              // Extract cohortMembershipId from bulkCreate response
              let newCohortMembershipId = null;
              const responseData = bulkCreateResponse?.data?.result || bulkCreateResponse?.data || bulkCreateResponse?.result;
              
              if (responseData) {
                if (Array.isArray(responseData)) {
                  newCohortMembershipId = responseData[0]?.cohortMembershipId || responseData[0]?.id || responseData[0]?.membershipId;
                } else if (responseData.cohortMembershipId) {
                  newCohortMembershipId = responseData.cohortMembershipId;
                } else if (responseData.id) {
                  newCohortMembershipId = responseData.id;
                } else if (responseData.membershipId) {
                  newCohortMembershipId = responseData.membershipId;
                } else if (responseData.userDetails && Array.isArray(responseData.userDetails)) {
                  newCohortMembershipId = responseData.userDetails[0]?.cohortMembershipId || responseData.userDetails[0]?.membershipId;
                } else if (responseData.result && Array.isArray(responseData.result)) {
                  newCohortMembershipId = responseData.result[0]?.cohortMembershipId || responseData.result[0]?.membershipId;
                }
              }

              // Step 2c: Update slot for new teacher (only if user has interacted with time pickers)
              if (newCohortMembershipId && timeSlotTouched) {
                // Ensure we use clean string values, not stringified JSON
                const fromTime = String(formData.fromTime || '').trim();
                const toTime = String(formData.toTime || '').trim();
                
                // Only update if both times are set
                if (fromTime && toTime) {
                  const slotValue = `${fromTime} - ${toTime}`;
                  const slotFieldId = 'f3658b23-1394-48a9-afc5-7589874465af';

                  console.log('📝 Updating slot for new teacher with:', { fromTime, toTime, slotValue });

                  try {
                    await put(
                      API_ENDPOINTS.cohortMemberUpdate(newCohortMembershipId),
                      {
                        cohortId: center.cohortId,
                        customFields: [
                          {
                            fieldId: slotFieldId,
                            value: [slotValue], // Value should be an array with a single string
                          },
                        ],
                      }
                    );
                    console.log('✅ Slot updated for new teacher:', slotValue);
                  } catch (slotError) {
                    slotUpdateSuccess = false;
                    console.error('Failed to update slot for new teacher:', slotError);
                  }
                } else {
                  console.log('⏭️ Skipping slot update for new teacher - time slot not explicitly selected');
                }
              } else if (newCohortMembershipId && !timeSlotTouched) {
                console.log('⏭️ Skipping slot update for new teacher - user has not interacted with time pickers');
              } else {
                slotUpdateSuccess = false;
                console.warn('⚠️ CohortMembershipId not found for new teacher');
              }
              
              console.log('✅ Teacher reassigned successfully');
            }
          } catch (reassignError) {
            console.error('❌ Failed to reassign teacher:', reassignError);
            throw reassignError; // Re-throw to stop the update process
          }
        }

        // Step 3: Handle teacher assignment if no teacher was assigned before
        if (!originalTeacherId && formData.teacherId) {
          console.log('👨‍🏫 Adding new teacher to class via bulkCreate');
          
          try {
            const bulkCreateResponse = await post(
              API_ENDPOINTS.cohortMemberBulkCreate,
              {
                userId: [formData.teacherId],
                cohortId: [center.cohortId],
              }
            );
            console.log('BulkCreate response:', bulkCreateResponse);

            // Extract cohortMembershipId from bulkCreate response
            let cohortMembershipId = null;
            const responseData = bulkCreateResponse?.data?.result || bulkCreateResponse?.data || bulkCreateResponse?.result;
            
            if (responseData) {
              if (Array.isArray(responseData)) {
                cohortMembershipId = responseData[0]?.cohortMembershipId || responseData[0]?.id || responseData[0]?.membershipId;
              } else if (responseData.cohortMembershipId) {
                cohortMembershipId = responseData.cohortMembershipId;
              } else if (responseData.id) {
                cohortMembershipId = responseData.id;
              } else if (responseData.membershipId) {
                cohortMembershipId = responseData.membershipId;
              } else if (responseData.userDetails && Array.isArray(responseData.userDetails)) {
                cohortMembershipId = responseData.userDetails[0]?.cohortMembershipId || responseData.userDetails[0]?.membershipId;
              } else if (responseData.result && Array.isArray(responseData.result)) {
                cohortMembershipId = responseData.result[0]?.cohortMembershipId || responseData.result[0]?.membershipId;
              }
            }

            // Update slot immediately after assigning teacher (only if user has interacted with time pickers)
            if (cohortMembershipId && timeSlotTouched) {
              // Ensure we use clean string values, not stringified JSON
              const fromTime = String(formData.fromTime || '').trim();
              const toTime = String(formData.toTime || '').trim();
              
              // Only update if both times are set
              if (fromTime && toTime) {
                const slotValue = `${fromTime} - ${toTime}`;
                const slotFieldId = 'f3658b23-1394-48a9-afc5-7589874465af';

                console.log('📝 Updating slot after teacher assignment with:', { fromTime, toTime, slotValue });

                try {
                  await put(
                    API_ENDPOINTS.cohortMemberUpdate(cohortMembershipId),
                    {
                      cohortId: center.cohortId,
                      customFields: [
                        {
                          fieldId: slotFieldId,
                          value: [slotValue], // Value should be an array with a single string
                        },
                      ],
                    }
                  );
                  console.log('✅ Slot updated after teacher assignment:', slotValue);
                } catch (slotError) {
                  slotUpdateSuccess = false;
                  console.error('Failed to update slot after teacher assignment:', slotError);
                }
              } else {
                console.log('⏭️ Skipping slot update after teacher assignment - time slot not explicitly selected');
              }
            } else if (cohortMembershipId && !timeSlotTouched) {
              console.log('⏭️ Skipping slot update after teacher assignment - user has not interacted with time pickers');
            }
          } catch (assignError) {
            console.error('Failed to assign teacher:', assignError);
            slotUpdateSuccess = false;
          }
        }

        // Step 4: Update slot if time has changed and teacher is assigned
        // Only update if user has explicitly interacted with time pickers
        const slotChanged = 
          (originalFromTime !== formData.fromTime || originalToTime !== formData.toTime);
        const currentTeacherId = formData.teacherId || originalTeacherId;

        if (slotChanged && timeSlotTouched && currentTeacherId) {
          console.log('⏰ Slot time changed, updating slot for teacher:', currentTeacherId);
          
          // Use stored cohortMembershipId or fetch it from cohortmember/list API
          let cohortMembershipId = assignedTeacherMembershipId;

          // If not stored, fetch from cohortmember/list API
          if (!cohortMembershipId) {
            try {
              const teacherRequestData = {
                limit: 300,
                offset: 0,
                filters: {
                  cohortId: center.cohortId,
                  role: 'Teacher',
                },
                sort: ['name', 'asc'],
              };

              const memberResponse = await getCohortMemberList(teacherRequestData);

              if (memberResponse && memberResponse.userDetails) {
                const teacherMember = memberResponse.userDetails.find(
                  (member) => member.userId === currentTeacherId
                );
                
                if (teacherMember) {
                  cohortMembershipId = teacherMember.cohortMembershipId || teacherMember.id || teacherMember.membershipId;
                }
              }
            } catch (memberError) {
              slotUpdateSuccess = false;
              console.error('Failed to fetch teacher membership:', memberError);
            }
          }

          if (cohortMembershipId) {
            console.log('CohortMembershipId found:', cohortMembershipId);
            
            // Update the slot with new fromTime and toTime
            // Ensure we use clean string values, not stringified JSON
            const fromTime = String(formData.fromTime || '').trim();
            const toTime = String(formData.toTime || '').trim();
            const slotValue = `${fromTime} - ${toTime}`;
            const slotFieldId = 'f3658b23-1394-48a9-afc5-7589874465af';

            console.log('📝 Updating slot with:', { fromTime, toTime, slotValue });

            try {
              await put(
                API_ENDPOINTS.cohortMemberUpdate(cohortMembershipId),
                {
                  cohortId: center.cohortId,
                  customFields: [
                    {
                      fieldId: slotFieldId,
                      value: [slotValue], // Value should be an array with a single string
                    },
                  ],
                }
              );
              console.log('✅ Slot updated successfully in edit mode:', slotValue);
            } catch (slotError) {
              slotUpdateSuccess = false;
              console.error('Failed to update slot in edit mode:', slotError);
            }
          } else {
            slotUpdateSuccess = false;
            console.warn('CohortMembershipId not found for teacher:', currentTeacherId);
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

          const newClassId = response.result?.cohortId;

          // Prepare data for parent callback
          resultData = response.data || {
            ...classData,
            cohortId: newClassId || `temp-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // For new classes, assign teacher immediately using bulkCreate
          if (formData.teacherId && newClassId) {
             console.log('Assigning teacher to new class:', newClassId);
             try {
                // Step 1: Call bulkCreate API to add teacher to cohort
                const bulkCreateResponse = await post(
                  API_ENDPOINTS.cohortMemberBulkCreate,
                  {
                    userId: [formData.teacherId],
                    cohortId: [newClassId],
                  }
                );
                console.log('BulkCreate response:', bulkCreateResponse);

                // Step 2: Extract cohortMembershipId from response
                // Response structure can vary, try multiple paths
                let cohortMembershipId = null;
                const responseData = bulkCreateResponse?.data?.result || bulkCreateResponse?.data || bulkCreateResponse?.result;
                
                
                if (responseData) {
                  // Check if it's an array and get the first item
                  if (Array.isArray(responseData)) {
                    cohortMembershipId = responseData[0]?.cohortMembershipId || responseData[0]?.id || responseData[0]?.membershipId;
                  } else if (responseData.cohortMembershipId) {
                    cohortMembershipId = responseData.cohortMembershipId;
                  } else if (responseData.id) {
                    cohortMembershipId = responseData.id;
                  } else if (responseData.membershipId) {
                    cohortMembershipId = responseData.membershipId;
                  } else if (responseData.userDetails && Array.isArray(responseData.userDetails)) {
                    cohortMembershipId = responseData.userDetails[0]?.cohortMembershipId || responseData.userDetails[0]?.membershipId;
                  } else if (responseData.result && Array.isArray(responseData.result)) {
                    cohortMembershipId = responseData.result[0]?.cohortMembershipId || responseData.result[0]?.membershipId;
                  }
                }

                if (cohortMembershipId) {
                  console.log('CohortMembershipId extracted:', cohortMembershipId);

                  // Step 3: Update the slot with fromTime and toTime
                  // Only update slot if user has explicitly interacted with time pickers
                  const fromTime = String(formData.fromTime || '').trim();
                  const toTime = String(formData.toTime || '').trim();
                  
                  // Only update slot if user has touched the time pickers and both times are set
                  if (timeSlotTouched && fromTime && toTime) {
                    // Format: "09:00 AM - 04:00 PM" in array
                    const slotValue = `${fromTime} - ${toTime}`;
                    const slotFieldId = 'f3658b23-1394-48a9-afc5-7589874465af'; // Hardcoded fieldId for slot

                    try {
                      const updateResponse = await put(
                        API_ENDPOINTS.cohortMemberUpdate(cohortMembershipId),
                        {
                          cohortId: newClassId,
                          customFields: [
                            {
                              fieldId: slotFieldId,
                              value: [slotValue], // Value should be an array
                            },
                          ],
                        }
                      );
                      console.log('Slot updated successfully:', slotValue, updateResponse);
                    } catch (slotError) {
                      slotUpdateSuccess = false;
                      console.error('Failed to update slot:', slotError);
                    }
                  } else {
                    console.log('⏭️ Skipping slot update - user has not interacted with time pickers');
                  }
                } else {
                  slotUpdateSuccess = false;
                  console.warn('CohortMembershipId not found in bulkCreate response. Full response:', bulkCreateResponse);
                }
             } catch (assignError) {
                 console.error('Failed to assign teacher:', assignError);
                 // Don't fail the entire operation if this fails
                 slotUpdateSuccess = false;
             }
          }
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

      // Set success message based on slot update status
      if (isEditing) {
        // Check if teacher was changed
        const originalMetadata = parseMetadata(center?.metadata);
        const originalTeacherId = originalMetadata?.teacherId || '';
        const teacherChanged = originalTeacherId !== formData.teacherId;
        
        // Check if slot was updated
        const originalFromTime = originalMetadata?.fromTime || '09:00 AM';
        const originalToTime = originalMetadata?.toTime || '04:00 PM';
        const slotChanged = 
          (originalFromTime !== formData.fromTime || originalToTime !== formData.toTime);
        
        if (teacherChanged) {
          if (slotUpdateSuccess) {
            setSuccessMessage(`${isCenter ? 'Center' : 'Class'} updated and teacher reassigned successfully!`);
          } else {
            setSuccessMessage(`${isCenter ? 'Center' : 'Class'} updated and teacher reassigned`);
          }
        } else if (slotChanged && (formData.teacherId || originalMetadata?.teacherId)) {
          if (slotUpdateSuccess) {
            setSuccessMessage(`${isCenter ? 'Center' : 'Class'} and slot timing updated successfully!`);
          } else {
            setSuccessMessage(`${isCenter ? 'Center' : 'Class'} updated successfully`);
          }
        } else {
          setSuccessMessage(`${isCenter ? 'Center' : 'Class'} updated successfully!`);
        }
      } else {
        // Only check slotUpdateSuccess for CREATE MODE
        // slotUpdateSuccess is only set in CREATE MODE, so check if teacher was assigned
        if (formData.teacherId) {
          if (slotUpdateSuccess) {
            setSuccessMessage(`${isCenter ? 'Center' : 'Class'} created and teacher assigned successfully!`);
          } else {
            setSuccessMessage(`${isCenter ? 'Center' : 'Class'} created and teacher assigned`);
          }
        } else {
          setSuccessMessage(`${isCenter ? 'Center' : 'Class'} created successfully!`);
        }
      }

      // Close after success
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
           console.error('Error saving class:', error);

      let errorMsg;
      if (error.message.includes('already exists')) {
        errorMsg = `${isCenter ? 'Center' : 'Class'} name already exists. Please use a different name.`;
        setErrors((prev) => ({ ...prev, className: errorMsg }));
      } else if (error.message.includes('Network Error')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else {
        errorMsg = error.message || `Failed to save ${isCenter ? 'center' : 'class'}. Please try again.`;
      }

      setErrorMessage(errorMsg);
      showToastMessage(errorMsg, 'error');
    } finally {
      isSubmittingRef.current = false;
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
      return `Class Teacher (Assigned to this ${isCenter ? 'center' : 'class'})`;
    }
    return 'Select Teacher *';
  };

  // Get teacher helper text
  const getTeacherHelperText = () => {
    if (loadingTeachers && teachers.length === 0) return 'Loading teachers...';
    if (teachers.length === 0) return 'No teachers available';
    return `${teachers.length} teacher(s) available`;
  };


  return (
    <>
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div">
            {center ? `Edit ${isCenter ? 'Center' : 'Class'}` : `Add New ${isCenter ? 'Center' : 'Class'}`}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {center
              ? `Update ${isCenter ? 'center' : 'class'} details`
              : `Fill in the details to create a new ${isCenter ? 'center' : 'class'}`}
          </Typography>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ py: 2 }}>
            <Grid container spacing={2}>
              {/* Cluster Selection - Commented out */}
              {/* <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
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
              </Grid> */}

              {/* School Selection */}
              <Grid item xs={12}>
                {isEditing ? (
                  <TextField
                    fullWidth
                    label={isCenter ? "Cluster" : "School"}
                    value={schools.find((s) => s.cohortId === formData.schoolId)?.name || parentName || formData.schoolId || ''}
                    margin="dense"
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText={`${isCenter ? "Cluster" : "School"} cannot be changed`}
                  />
                ) : (
                  <FormControl
                    fullWidth
                    margin="dense"
                    error={!!errors.schoolId}
                  >
                    <InputLabel id="school-label">{`Select ${isCenter ? 'Cluster' : 'School'} *`}</InputLabel>
                    <Select
                      labelId="school-label"
                      id="schoolId"
                      name="schoolId"
                      value={formData.schoolId}
                      onChange={(e) => handleSchoolChange(e.target.value)}
                      label={`Select ${isCenter ? 'Cluster' : 'School'} *`}
                      disabled={loading || loadingSchools}
                      onClose={() => setSchoolSearchTerm('')} // Clear search when closed
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
                          // autofocus
                          placeholder={`Search ${isCenter ? 'Cluster' : 'School'}...`}
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
                                <SearchIcon />
                              </InputAdornment>
                            ),
                          }}
                          onChange={(e) => setSchoolSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Escape') {
                              // Prevents autoselecting item while typing (default Select behaviour)
                              e.stopPropagation();
                            }
                          }}
                        />
                      </ListSubheader>
                      <MenuItem value="">
                        <em>{`Select a ${isCenter ? 'cluster' : 'school'}`}</em>
                      </MenuItem>
                      {loadingSchools ? (
                        <MenuItem disabled>
                          <CircularProgress size={20} />
                          <Typography variant="body2" sx={{ ml: 2 }}>
                            {`Loading ${isCenter ? 'clusters' : 'schools'}...`}
                          </Typography>
                        </MenuItem>
                      ) : (
                        schools
                          .filter((school) =>
                            school.name
                              .toLowerCase()
                              .includes(schoolSearchTerm.toLowerCase())
                          )
                          .map((school) => (
                            <MenuItem key={school.cohortId} value={school.cohortId}>
                              {school.name}
                            </MenuItem>
                          ))
                      )}
                      {!loadingSchools &&
                        schools.filter((school) =>
                          school.name
                            .toLowerCase()
                            .includes(schoolSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <MenuItem disabled>
                            <Typography variant="body2">
                              {`No ${isCenter ? 'clusters' : 'schools'} found`}
                            </Typography>
                          </MenuItem>
                        )}
                    </Select>
                    {errors.schoolId && (
                      <FormHelperText>{errors.schoolId}</FormHelperText>
                    )}
                  </FormControl>
                )}
              </Grid>

              {/* Existing Classes Display */}
              {/* {formData.schoolId && classes.length > 0 && (
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
              )} */}

              {/* Class Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="className"
                  name="className"
                  label={isCenter ? "Center Name" : "Class Name"}
                  placeholder={isCenter ? "e.g., Center A, Community Center, etc." : "e.g., Class 1A, Grade 5B, etc."}
                  value={formData.className}
                  onChange={handleChange}
                  error={!!errors.className}
                  helperText={
                    isEditing 
                      ? `${isCenter ? 'Center' : 'Class'} name cannot be changed`
                      : (errors.className || `Enter a unique name for this ${isCenter ? 'center' : 'class'}`)
                  }
                  margin="dense"
                  disabled={loading || !formData.schoolId || isEditing}
                  required
                  InputProps={{
                    readOnly: isEditing,
                    endAdornment: formData.className && !isEditing && (
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
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'inherit',
                    color: 'text.primary',
                  },
                }}
                />
              </Grid>
{
  (isCenter && isEditing) && 
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
}
              {/* Teacher Selection */}
              {!(isCenter && isEditing) && (
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
                      ref={(node) => {
                        teacherSelectRef.current = node;
                        if (node) {
                          setTeacherSelectWidth(node.clientWidth);
                        }
                      }}
                      labelId="teacher-label"
                      id="teacherId"
                      name="teacherId"
                      value={formData.teacherId}
                      onChange={(e) =>
                        handleSelectChange('teacherId', e.target.value)
                      }
                      label={getTeacherLabel()}
                      disabled={loading || (loadingTeachers && teachers.length === 0)}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            maxHeight: 300,
                            width: teacherSelectWidth ? `${teacherSelectWidth}px` : 'auto',
                            minWidth: teacherSelectWidth ? `${teacherSelectWidth}px` : 'auto',
                            maxWidth: teacherSelectWidth ? `${teacherSelectWidth}px` : 'none',
                            overflowX: 'auto',
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': {
                              width: '0px',
                              height: '0px',
                              background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              background: 'transparent',
                            },
                            '&::-webkit-scrollbar-track': {
                              background: 'transparent',
                            },
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            '& .MuiList-root': {
                              overflowX: 'auto',
                              overflowY: 'auto',
                              '&::-webkit-scrollbar': {
                                width: '0px',
                                height: '0px',
                                background: 'transparent',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: 'transparent',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                              },
                              scrollbarWidth: 'none',
                              msOverflowStyle: 'none',
                            },
                            '& .MuiListSubheader-root': {
                              position: 'sticky',
                              top: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 10,
                              padding: '8px',
                              paddingBottom: '4px',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            },
                            '& .MuiMenuItem-root': {
                              whiteSpace: 'nowrap',
                              overflowX: 'auto',
                              minWidth: 'max-content',
                            },
                          },
                        },
                        anchorOrigin: {
                          vertical: 'bottom',
                          horizontal: 'left',
                        },
                        transformOrigin: {
                          vertical: 'top',
                          horizontal: 'left',
                        },
                        autoFocus: false,
                      }}
                    >
                      <ListSubheader sx={{ px: 1, py: 0.5, lineHeight: 1, m: 0, width: '100%' }}>
                        <TextField
                          size="small"
                          placeholder="Search teachers..."
                          value={teacherSearchTerm}
                          onChange={(e) => {
                            e.stopPropagation();
                            setTeacherSearchTerm(e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
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
                              <InputAdornment position="start" sx={{ ml: 0 }}>
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </ListSubheader>
                      <MenuItem value="">
                        <em>Select a teacher</em>
                      </MenuItem>
                      {loadingTeachers && teachers.length === 0 ? (
                        <MenuItem disabled>
                          <CircularProgress size={20} />
                          <Typography variant="body2" sx={{ ml: 2 }}>
                            Loading teachers...
                          </Typography>
                        </MenuItem>
                      ) : teachers.length === 0 ? (
                        <MenuItem disabled>
                          No teachers available
                        </MenuItem>
                      ) : (
                        teachers.map((teacher) => (
                          <MenuItem 
                            key={teacher.id} 
                            value={teacher.id}
                            sx={{
                              whiteSpace: 'nowrap',
                              overflowX: 'auto',
                              minWidth: 'max-content',
                            }}
                          >
                            {teacher.firstName} {teacher.lastName}
                            {teacher.email && ` (${teacher.email})`}
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
              )}

              {/* Time Selection - Using MUI TimePicker */}
              {!(isCenter && isEditing) && (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Grid item xs={12} md={6}>
                    <FormControl
                      fullWidth
                      margin="dense"
                      error={!!errors.fromTime}
                    >
                      <TimePicker
                        label="From Time"
                        value={
                          formData.fromTime
                            ? dayjs(formData.fromTime, 'hh:mm A')
                            : null
                        }
                        onChange={(newValue) => {
                          setTimeSlotTouched(true); // Mark that user has interacted with time picker
                          handleSelectChange(
                            'fromTime',
                            newValue ? newValue.format('hh:mm A') : ''
                          );
                        }}
                        disabled={loading}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.fromTime,
                            helperText: errors.fromTime || (isEditing && assignedTeacherData?.slot ? `Current slot: ${assignedTeacherData.slot}` : ''),
                            sx: {
                              '& .MuiInputBase-input': {
                                color: 'text.primary',
                              },
                            },
                          },
                          popper: {
                            sx: {
                              '& .MuiMultiSectionDigitalClockSection-item.Mui-selected': {
                                color: '#000000 !important',
                                fontWeight: 'bold',
                              },
                              '& .MuiMenuItem-root.Mui-selected': {
                                color: '#000000 !important',
                                fontWeight: 'bold',
                              },
                            },
                          },
                        }}
                      />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="dense" error={!!errors.toTime}>
                      <TimePicker
                        label="To Time"
                        value={
                          formData.toTime
                            ? dayjs(formData.toTime, 'hh:mm A')
                            : null
                        }
                        onChange={(newValue) => {
                          setTimeSlotTouched(true); // Mark that user has interacted with time picker
                          handleSelectChange(
                            'toTime',
                            newValue ? newValue.format('hh:mm A') : ''
                          );
                        }}
                        disabled={loading}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.toTime,
                            helperText: errors.toTime,
                            sx: {
                              '& .MuiInputBase-input': {
                                color: 'text.primary',
                              },
                            },
                          },
                          popper: {
                            sx: {
                              '& .MuiMultiSectionDigitalClockSection-item.Mui-selected': {
                                color: '#000000 !important',
                                fontWeight: 'bold',
                              },
                              '& .MuiMenuItem-root.Mui-selected': {
                                color: '#000000 !important',
                                fontWeight: 'bold',
                              },
                            },
                          },
                        }}
                      />
                    </FormControl>
                  </Grid>
                </LocalizationProvider>
              )}
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
                !formData.className.trim() ||
                // !formData.teacherId ||
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
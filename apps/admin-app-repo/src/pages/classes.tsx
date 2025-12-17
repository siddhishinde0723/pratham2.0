/* eslint-disable @nx/enforce-module-boundaries */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Menu,
  Checkbox,
  ListItemText,
  Pagination,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  FilterAlt as FilterIcon,
  School as SchoolIcon,
  Groups as GroupsIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Sort as SortIcon,
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import CenterForm from '../components/Center/CenterForm';
import {
  getCohortList,
  createCohort,
  updateCohortUpdate,
  getCohortMemberList,
} from '../services/CohortService/cohortService';
import { addStudentsToClass } from '../services/CohortService/cohortService'; // Add this import
import { showToastMessage } from '@/components/Toastify';
import { userList } from '@/services/UserList';

// Define types based on your API response
interface CohortCenter {
  cohortId: string;
  parentId: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'pending' | 'archived';
  image: string | null;
  referenceId: string | null;
  metadata: any;
  tenantId: string;
  programId: string | null;
  attendanceCaptureImage: boolean;
  params: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  customFields: any[];
}

interface Student {
  email: any;
  userId: string;
  enrollmentId: string | null;
  username: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  role: string;
  mobile: string | null;
  deviceId: string | null;
  status: 'active' | 'inactive' | 'pending';
  statusReason: string | null;
  cohortMembershipId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string | null;
  customField: any[];
}

// Define sortable columns
type SortableColumn = 'name' | 'createdAt' | 'status' | 'type';
type SortDirection = 'asc' | 'desc';

const Centers = () => {
  const [centers, setCenters] = useState<CohortCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'pending' | 'archived'
  >('all');
  const [selectedCluster, setSelectedCluster] = useState('All');
  const [clusters, setClusters] = useState<CohortCenter[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [schools, setSchools] = useState<CohortCenter[]>([]);
  const [selectedSchoolType, setSelectedSchoolType] = useState('All');
  const [openForm, setOpenForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CohortCenter | null>(null);

  // Add Students Dialog State
  const [openAddStudentsDialog, setOpenAddStudentsDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<CohortCenter | null>(null);
  const [dialogCluster, setDialogCluster] = useState('');
  const [dialogSchool, setDialogSchool] = useState('');
  const [dialogClass, setDialogClass] = useState('');
  const [dialogSchools, setDialogSchools] = useState<CohortCenter[]>([]);
  const [dialogClasses, setDialogClasses] = useState<CohortCenter[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [addingStudents, setAddingStudents] = useState(false);
  
  // Lazy Loading States
  const [studentOffset, setStudentOffset] = useState(0);
  const [customLoading, setCustomLoading] = useState(false);
  const [hasMoreStudents, setHasMoreStudents] = useState(true);

  // Archive/Unarchive Dialog State
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [centerToUpdate, setCenterToUpdate] = useState<CohortCenter | null>(
    null
  );
  const [archiveLoading, setArchiveLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    cohortId: true,
    parentId: true,
    type: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    actions: true,
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<SortableColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Academic Year ID - You might need to get this dynamically from your app state
  const [cohortAcademicYearId] = useState(
    localStorage.getItem('academicYearId') || ''
  );

  // Fetch clusters from API
  const fetchClusters = useCallback(async () => {
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
    }
  }, []);

  // Fetch schools from API
  const fetchSchools = useCallback(async (clusterId?: string) => {
    try {
      const schoolRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'SCHOOL',
          status: ['active'],
          ...(clusterId && clusterId !== 'All' && { parentId: [clusterId] }),
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
    }
  }, []);

  // Fetch centers from API
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filters based on selections
      const filters: any = {
        type: 'COHORT',
        ...(statusFilter !== 'all' && { status: [statusFilter] }),
      };

      // IMPORTANT FIX: Only add parentId filter when school is selected
      // When both cluster and school are selected, we should filter by school (which is more specific)
      if (selectedSchool !== 'All') {
        filters.parentId = [selectedSchool];
      }
      // If only cluster is selected (but no school), we shouldn't filter by cluster for classes
      // because classes have schools as parent, not clusters
      // So we only filter when a specific school is selected
      else if (selectedCluster !== 'All') {
        // When only cluster is selected, we need to get all schools in that cluster first
        // and then filter classes by those school IDs
        const clusterSchools = schools.filter(
          (school) => school.parentId === selectedCluster
        );
        if (clusterSchools.length > 0) {
          filters.parentId = clusterSchools.map((school) => school.cohortId);
        }
      }

      console.log('Fetching centers with filters:', filters);

      const requestData = {
        limit: pagination.limit,
        offset: pagination.page * pagination.limit,
        sort: [sortBy, sortDirection],
        filters: filters,
      };

      const response = await getCohortList(requestData);

      // Handle the response format
      if (response && typeof response === 'object') {
        if (response instanceof Error) {
          throw response;
        }

        if (
          response?.results?.cohortDetails &&
          Array.isArray(response.results.cohortDetails)
        ) {
          const centersData = response.results.cohortDetails;
          const totalCount = centersData.length;

          console.log(`✅ Successfully loaded ${centersData.length} centers`);
          setCenters(centersData);
          setPagination((prev) => ({
            ...prev,
            total: totalCount,
          }));
        } else if (Array.isArray(response)) {
          setCenters(response);
          setPagination((prev) => ({
            ...prev,
            total: response.length,
          }));
        } else {
          setCenters([]);
          setPagination((prev) => ({ ...prev, total: 0 }));
        }
      } else if (response === undefined || response === null) {
        throw new Error('No response received from API');
      } else {
        setCenters([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
    } catch (err: any) {
      console.error('Error fetching centers:', err);
      const errorMessage = err.message || 'Failed to fetch centers from server';
      setError(errorMessage);
      showToastMessage(errorMessage, 'error');

      setCenters([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    sortBy,
    sortDirection,
    statusFilter,
    selectedCluster,
    selectedSchool,
    schools, // Added schools as dependency to get updated list
  ]);

  // Initial fetch
  useEffect(() => {
    fetchClusters();
    fetchSchools();
  }, [fetchClusters, fetchSchools]);

  // Fetch centers whenever filters change
  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  // Reset school selection when cluster changes
  useEffect(() => {
    if (selectedCluster !== 'All') {
      // Fetch schools for the selected cluster
      fetchSchools(selectedCluster);
    } else {
      // If cluster is "All", fetch all schools
      fetchSchools();
    }
    // Reset school selection when cluster changes
    setSelectedSchool('All');
  }, [selectedCluster, fetchSchools]);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle status filter change
  const handleStatusChange = (
    event: React.MouseEvent<HTMLElement>,
    newStatus: 'all' | 'active' | 'inactive' | 'pending' | 'archived'
  ) => {
    if (newStatus !== null) {
      setStatusFilter(newStatus);
      setPagination((prev) => ({ ...prev, page: 0 }));
    }
  };

  // Handle cluster filter change
  const handleClusterChange = (event: SelectChangeEvent) => {
    const newCluster = event.target.value;
    setSelectedCluster(newCluster);
    // School will be reset in useEffect above
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  // Handle school filter change
  const handleSchoolChange = (event: SelectChangeEvent) => {
    setSelectedSchool(event.target.value);
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  // Handle school type filter (if available in metadata)
  const handleSchoolTypeChange = (event: SelectChangeEvent) => {
    setSelectedSchoolType(event.target.value);
  };

  // Handle page change
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPagination((prev) => ({ ...prev, page: value - 1 }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: SelectChangeEvent) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  // Handle sort
  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Handle add/edit center
  const handleAddCenter = () => {
    setEditingCenter(null);
    setOpenForm(true);
  };

  const handleEditCenter = (center: CohortCenter) => {
    setEditingCenter(center);
    setOpenForm(true);
  };

  // Handle archive/unarchive center
  const handleArchiveCenter = (center: CohortCenter) => {
    setCenterToUpdate(center);
    setArchiveDialogOpen(true);
  };

  // Handle confirm archive/unarchive
  const handleConfirmArchive = async () => {
    if (!centerToUpdate) return;

    setArchiveLoading(true);
    try {
      const newStatus =
        centerToUpdate.status === 'active' ? 'archived' : 'active';
      const updateData = {
        status: newStatus,
        type: 'COHORT',
      };

      const response = await updateCohortUpdate(
        centerToUpdate.cohortId,
        updateData
      );

      if (response?.success) {
        await fetchCenters();
        const action = newStatus === 'archived' ? 'archived' : 'activated';
        showToastMessage(`Center ${action} successfully`, 'success');
      }
    } catch (err) {
      console.error('Error updating center status:', err);
      showToastMessage('Failed to update center status', 'error');
    } finally {
      setArchiveLoading(false);
      setArchiveDialogOpen(false);
      setCenterToUpdate(null);
    }
  };

  // Handle cancel archive/unarchive
  const handleCancelArchive = () => {
    setArchiveDialogOpen(false);
    setCenterToUpdate(null);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchCenters();
  };

  // Handle column visibility menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleColumnToggle = (column: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column as keyof typeof prev],
    }));
  };

  // Handle Add Students Dialog
  const handleOpenAddStudents = (center: CohortCenter) => {
    setSelectedClass(center);
    setOpenAddStudentsDialog(true);
    setDialogCluster('');
    setDialogSchool('');
    setDialogClass('');
    setDialogSchools([]);
    setDialogClasses([]);
    setStudents([]);
    setSelectedStudents([]);
    setStudentSearchTerm('');

    // Fetch students from the global list (not passing a source class ID)
    // Pass the target class ID specifically to ensure we know who to exclude
    fetchStudents(undefined, center.cohortId, '');
  };

  const handleCloseAddStudents = () => {
    setOpenAddStudentsDialog(false);
    setSelectedClass(null);
    setDialogCluster('');
    setDialogSchool('');
    setDialogClass('');
    setDialogSchools([]);
    setDialogClasses([]);
    setStudents([]);
    setSelectedStudents([]);
    setStudentSearchTerm('');
  };

  // Fetch schools based on selected cluster in dialog
  const fetchDialogSchools = useCallback(async (clusterId: string) => {
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
        setDialogSchools(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setDialogSchools(response);
      } else {
        setDialogSchools([]);
      }
    } catch (err) {
      console.error('Error fetching dialog schools:', err);
      setDialogSchools([]);
      showToastMessage('Failed to fetch schools', 'error');
    }
  }, []);

  // Fetch classes based on selected school in dialog
  const fetchDialogClasses = useCallback(async (schoolId: string) => {
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
        setDialogClasses(response.results.cohortDetails);
      } else if (Array.isArray(response)) {
        setDialogClasses(response);
      } else {
        setDialogClasses([]);
      }
    } catch (err) {
      console.error('Error fetching dialog classes:', err);
      setDialogClasses([]);
      showToastMessage('Failed to fetch classes', 'error');
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedClass) {
  
        if (dialogClass) {
           fetchStudents(dialogClass, selectedClass.cohortId, studentSearchTerm);
        } else {
           fetchStudents(undefined, selectedClass.cohortId, studentSearchTerm);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [studentSearchTerm, selectedClass, dialogClass]);

  // Fetch students based on selected class in dialog
  const fetchStudents = useCallback(
    async (
      sourceClassId?: string,
      explicitTargetClassId?: string,
      searchTerm?: string,
      offset: number = 0,
      isLoadMore: boolean = false
    ) => {
      if (isLoadMore) {
        setCustomLoading(true);
      } else {
        setLoadingStudents(true);
      }
      // Only clear if not searching and not loading more
      if (!searchTerm && !isLoadMore) {
          setStudents([]); 
      }

      try {
        // If explicitTargetClassId is provided, use it; otherwise use selectedClass state
        const targetClassId = explicitTargetClassId || selectedClass?.cohortId;

        if (!targetClassId) {
          console.error('No target class ID provided');
          setStudents([]);
          return;
        }

        // Step 1: Fetch students already in this class (to exclude them)
        let existingStudentIds = new Set<string>();

        try {
          const cohortRequestData: any = {
            limit: 0,
            offset: 0,
            filters: {
              cohortId: targetClassId,
              status: ['active'],
            },
          };

          const cohortResponse: any = await getCohortMemberList(
            cohortRequestData
          );

          if (
            cohortResponse?.userDetails &&
            Array.isArray(cohortResponse.userDetails)
          ) {
            cohortResponse.userDetails.forEach((student: any) => {
              if (student.userId) {
                existingStudentIds.add(student.userId);
              }
            });
           /* console.log(
              `Found ${existingStudentIds.size} students already in target class ${targetClassId}`
            );*/
          }
        } catch (cohortErr) {
          console.error('Error fetching cohort members:', cohortErr);
        }

        // Step 2: Determine which students to fetch
        let allStudents: any[] = [];

        // MODE 1: Filter Mode (User selected a source class)
        if (sourceClassId) {
          console.log('Filter mode: Fetching students from source class:', sourceClassId);
           try {
            const cohortRequestData: any = {
              limit: 0, // Using 0 here is generally safer for a single class roster than global list
              offset: 0,
              filters: {
                cohortId: sourceClassId,
                status: ['active'],
              },
            };

            const cohortResponse: any = await getCohortMemberList(
              cohortRequestData
            );

            if (
              cohortResponse?.userDetails &&
              Array.isArray(cohortResponse.userDetails)
            ) {
               allStudents = cohortResponse.userDetails;
            } else {
               if(Array.isArray(cohortResponse)) {
                   allStudents = cohortResponse;
               }
            }
            
            // Client-side filtering for search term if in Mode 1 (since we fetched the whole class)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                allStudents = allStudents.filter(student => 
                    (student.firstName && student.firstName.toLowerCase().includes(term)) ||
                    (student.lastName && student.lastName.toLowerCase().includes(term)) ||
                    (student.username && student.username.toLowerCase().includes(term))
                );
            }

          } catch (err) {
            console.error('Error fetching source class students:', err);
             showToastMessage('Failed to fetch students from selected class', 'error');
          }
        }
        // MODE 2: Global Mode (No source class selected)
        else {
          console.log(
            'Global mode: Fetching students from global list with search:', searchTerm, 'offset:', offset
          );

          try {
            const userListRequestData: any = {
              limit: 100, // PERFORMANCE FIX: Limit to 100
              offset: offset, // Use offset for pagination
              filters: {
                role: 'Student',
                status: ['active'],
                // Add search filters
                ...(searchTerm && { firstName: searchTerm }),
              },
            };
             // Also add username if search term exists (if backend supports searching both)
             if (searchTerm) {
                 userListRequestData.filters.username = searchTerm;
             }

            const userListResponse: any = await userList(userListRequestData);

            if (
              userListResponse?.getUserDetails &&
              Array.isArray(userListResponse.getUserDetails)
            ) {
              allStudents = userListResponse.getUserDetails;
            } else if (Array.isArray(userListResponse)) {
              allStudents = userListResponse;
            }
             console.log(
                `Fetched ${allStudents.length} students from global list`
              );
              
             // Check if we have more students
             if (allStudents.length < 100) {
                 setHasMoreStudents(false);
             } else {
                 setHasMoreStudents(true);
             }
             
          } catch (userListErr) {
            console.error('Error fetching user list:', userListErr);
            showToastMessage('Failed to fetch student list', 'error');
          }
        }

        // Step 3: Filter out students who are already in the target class
        const availableStudents: Student[] = allStudents
          .filter((student: any) => {
            const hasUserId = student.userId && typeof student.userId === 'string';
            const isAlreadyInTarget = hasUserId && existingStudentIds.has(student.userId);
            return hasUserId && !isAlreadyInTarget;
          })
          .map((student: any) => {
            return {
              userId: student.userId,
              enrollmentId: student.enrollmentId || null,
              username: student.username || '',
              firstName: student.firstName || '',
              middleName: student.middleName || null,
              lastName: student.lastName || '',
              role: student.role || 'Student',
              mobile: student.mobile || null,
              deviceId: student.deviceId || null,
              status: student.status || 'active',
              statusReason: student.statusReason || null,
              cohortMembershipId: '',
              createdAt: student.createdAt || new Date().toISOString(),
              updatedAt: student.updatedAt || new Date().toISOString(),
              createdBy: student.createdBy || '',
              updatedBy: student.updatedBy || null,
              customField: student.customFields || student.customField || [],
              email: student.email || null,
              name:
                student.name ||
                `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            };
          });
        
        if (isLoadMore) {
            setStudents(prev => [...prev, ...availableStudents]);
        } else {
            setStudents(availableStudents);
        }

      } catch (err: any) {
        console.error('Error in fetchStudents:', err);
        const errorMessage =
          err.message || 'Failed to load students. Please try again.';
        showToastMessage(errorMessage, 'error');
        if (!isLoadMore) {
            setStudents([]);
        }
      } finally {
        setLoadingStudents(false);
        setCustomLoading(false);
      }
    },
    [selectedClass, dialogClass] // Added dialogClass as dependency
  );
  // Handle cluster change in dialog
  const handleDialogClusterChange = (event: SelectChangeEvent) => {
    const clusterId = event.target.value;
    setDialogCluster(clusterId);
    setDialogSchool('');
    setDialogClass('');
    setDialogSchools([]);
    setDialogClasses([]);
    setStudents([]);
    setSelectedStudents([]);

    if (clusterId) {
      fetchDialogSchools(clusterId);
    }
  };

  // Handle school change in dialog
  const handleDialogSchoolChange = (event: SelectChangeEvent) => {
    const schoolId = event.target.value;
    setDialogSchool(schoolId);
    setDialogClass('');
    setDialogClasses([]);
    setStudents([]);
    setSelectedStudents([]);

    if (schoolId) {
      fetchDialogClasses(schoolId);
    }
  };

  // Handle class change in dialog
  const handleDialogClassChange = (event: SelectChangeEvent) => {
    const classId = event.target.value;
    setDialogClass(classId);
    setStudents([]);
    setSelectedStudents([]);

    // Fetch students for the filtered class - Handle by useEffect now
    // if (classId) {
    //   fetchStudents(classId);
    // }
  };

  // Handle student selection
  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Handle select all students
  const handleSelectAllStudents = () => {
    const filteredStudentIds = filteredStudents.map((s) => s.userId);
    setSelectedStudents(filteredStudentIds);
  };

  // Handle deselect all students
  const handleDeselectAllStudents = () => {
    setSelectedStudents([]);
  };

  // Handle apply (add selected students to class) - UPDATED WITH API INTEGRATION
  const handleApplyStudents = async () => {
    if (!selectedClass) {
      showToastMessage('No target class selected', 'error');
      return;
    }

    if (selectedStudents.length === 0) {
      showToastMessage('Please select at least one student', 'warning');
      return;
    }

    const targetClassId = selectedClass.cohortId;

    try {
      setAddingStudents(true);
      console.log(
        'Adding students:',
        selectedStudents,
        'to class:',
        targetClassId
      );

      // Prepare data for API call
      const requestData = {
        cohortId: [targetClassId], // Array with the target class ID
        userId: selectedStudents, // Array of selected student IDs
        // cohortAcademicYearId: cohortAcademicYearId, // Academic year ID
      };

      console.log('API Request Data:', requestData);

      // Call the API to add students
      const response = await addStudentsToClass(requestData);

      console.log('API Response:', response);

      if (response?.responseCode === 201) {
        let className = selectedClass?.name;
        if (dialogClass && dialogClasses.length > 0) {
          const filteredClass = dialogClasses.find(
            (c) => c.cohortId === dialogClass
          );
          if (filteredClass) {
            className = filteredClass.name;
          }
        }
        showToastMessage(
          `Successfully added ${selectedStudents.length} student(s) to ${selectedClass.name}`,
          'success'
        );

        // Close the dialog
        handleCloseAddStudents();

        // Optional: Refresh the class data to show updated student count
        // You might want to fetch the updated class information here
      } else {
        throw new Error(response?.message || 'Failed to add students');
      }
    } catch (err: any) {
      console.error('Error adding students:', err);

      // Show detailed error message
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to add students. Please try again.';

      showToastMessage(errorMessage, 'error');

      // You can also show the error in the dialog if you want
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setAddingStudents(false);
    }
  };

  // Handle reset in dialog
  const handleResetDialog = () => {
    setDialogCluster('');
    setDialogSchool('');
    setDialogClass('');
    setDialogSchools([]);
    setDialogClasses([]);
    setSelectedStudents([]);
    setStudentSearchTerm('');

    // When resetting, fetch students from the global list (Source=undefined)
    // Handled by useEffect dependency on dialogClass/studentSearchTerm changes
    // if (selectedClass) {
    //   fetchStudents(undefined, selectedClass.cohortId);
    // }
  };

  // Handle form submission
  const handleFormSubmit = async (centerData: any) => {
    setLoading(true);
    try {
      if (editingCenter) {
        const updateData = {
          ...centerData,
          type: 'COHORT',
        };

        const response = await updateCohortUpdate(
          editingCenter.cohortId,
          updateData
        );

        if (response?.success) {
          await fetchCenters();
          showToastMessage('Center updated successfully', 'success');
        }
      } else {
        const createData = {
          ...centerData,
          type: 'COHORT',
          status: centerData.status || 'active',
        };

        const response = await createCohort(createData);

        if (response?.success) {
          await fetchCenters();
          showToastMessage('Center created successfully', 'success');
        }
      }
    } catch (err: any) {
      console.error('Error saving center:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to save center';
      showToastMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
      setOpenForm(false);
    }
  };

  // Filter centers based on search - now only local filtering since API handles the main filters
  const filteredCenters = useMemo(() => {
    let filtered = [...centers];

    // Apply local search filter (only for name/search term)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (center) =>
          center.name.toLowerCase().includes(term) ||
          center.cohortId.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [centers, searchTerm]);

  // Filter students based on search in dialog
  // optimization: Search is now handled server-side or in fetchStudents, so this just passes through
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    // Apply local search filter
    if (studentSearchTerm) {
      const term = studentSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          (student.firstName && student.firstName.toLowerCase().includes(term)) ||
          (student.lastName && student.lastName.toLowerCase().includes(term)) ||
          (student.username && student.username.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [students, studentSearchTerm]);

  // Calculate stats
  const activeCount = centers.filter((c) => c.status === 'active').length;
  const archivedCount = centers.filter((c) => c.status === 'archived').length;
  const inactiveCount = centers.filter((c) => c.status === 'inactive').length;
  const pendingCount = centers.filter((c) => c.status === 'pending').length;

  // Get archive/unarchive button color and tooltip
  const getArchiveButtonProps = (center: CohortCenter) => {
    if (center.status === 'active') {
      return {
        color: 'error' as const,
        tooltip: 'Archive Class',
      };
    } else if (center.status === 'archived') {
      return {
        color: 'default' as const,
        tooltip: 'Activate Class',
      };
    } else {
      return {
        color: 'warning' as const,
        tooltip: 'Update Status',
      };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString || 'N/A';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'archived':
        return 'warning';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon fontSize="small" />;
      case 'inactive':
        return <CancelIcon fontSize="small" />;
      case 'pending':
        return <PendingIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Get center type text
  const getTypeText = (type: string) => {
    if (!type) return 'Unknown';
    switch (type.toUpperCase()) {
      case 'COHORT':
        return 'Class';
      case 'SCHOOL':
        return 'School';
      case 'INSTITUTE':
        return 'Institute';
      default:
        return type;
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Get display value for any field
  const getDisplayValue = (value: any) => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }
    return value;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Classes
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage all classes and their details
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCenter}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
            >
              Add New Class
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              minWidth: 200,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderLeft: '4px solid #1976d2',
            }}
          >
            <SchoolIcon sx={{ fontSize: 40, color: '#1976d2' }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {pagination.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Classes
              </Typography>
            </Box>
          </Paper>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              minWidth: 200,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderLeft: '4px solid #4caf50',
            }}
          >
            <GroupsIcon sx={{ fontSize: 40, color: '#4caf50' }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {activeCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Classes
              </Typography>
            </Box>
          </Paper>
          <Paper
            sx={{
              p: 2,
              flex: 1,
              minWidth: 200,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderLeft: '4px solid #ff9800',
            }}
          >
            <GroupsIcon sx={{ fontSize: 40, color: '#ff9800' }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {archivedCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Inactive Classes
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filter Section */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Active/Archived/All Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusChange}
                size="medium"
              >
                <ToggleButton
                  value="active"
                  sx={{
                    color: '#4caf50',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    '&.Mui-selected': {
                      backgroundColor: '#e8f5e8',
                      color: '#4caf50',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    },
                  }}
                >
                  <Typography variant="body2">Active</Typography>
                </ToggleButton>
                <ToggleButton
                  value="archived"
                  sx={{
                    color: '#ff9800',
                    '&.Mui-selected': {
                      backgroundColor: '#fff3e0',
                      color: '#ff9800',
                    },
                  }}
                >
                  <Typography variant="body2">Inactive</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Search Bar */}
            <Box sx={{ flexGrow: 1, maxWidth: 300 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search classes by name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Cluster Dropdown */}
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="cluster-filter-label">
                  Search by Cluster
                </InputLabel>
                <Select
                  labelId="cluster-filter-label"
                  id="cluster-filter"
                  value={selectedCluster}
                  label="Search by Cluster"
                  onChange={handleClusterChange}
                >
                  <MenuItem value="All">-</MenuItem>
                  {clusters.map((cluster) => (
                    <MenuItem key={cluster.cohortId} value={cluster.cohortId}>
                      {cluster.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* School Dropdown */}
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="school-filter-label">
                  Search by School
                </InputLabel>
                <Select
                  labelId="school-filter-label"
                  id="school-filter"
                  value={selectedSchool}
                  label="Search by School"
                  onChange={handleSchoolChange}
                >
                  <MenuItem value="All">-</MenuItem>
                  {schools.map((school) => (
                    <MenuItem key={school.cohortId} value={school.cohortId}>
                      {school.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Column Visibility Menu */}
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem>
                <ListItemText primary="Column Visibility" />
              </MenuItem>
              {Object.entries(columnVisibility).map(([column, visible]) => (
                <MenuItem
                  key={column}
                  onClick={() => handleColumnToggle(column)}
                >
                  <Checkbox checked={visible} />
                  <ListItemText
                    primary={
                      column.charAt(0).toUpperCase() +
                      column.slice(1).replace(/([A-Z])/g, ' $1')
                    }
                  />
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Paper>

        {/* Centers Table */}
        <Paper sx={{ position: 'relative', minHeight: 400 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 400,
              }}
            >
              <CircularProgress />
            </Box>
          ) : filteredCenters.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 400,
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography variant="h6" color="textSecondary">
                No Classes Found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchTerm ||
                selectedCluster !== 'All' ||
                selectedSchool !== 'All' ||
                statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No classes available. Try adding a new class.'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {columnVisibility.name && (
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'name'}
                            direction={
                              sortBy === 'name' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('name')}
                          >
                            Class Name
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {columnVisibility.cohortId && (
                        <TableCell>Class ID</TableCell>
                      )}
                      {columnVisibility.parentId && (
                        <TableCell>Parent School</TableCell>
                      )}
                   
                      {columnVisibility.status && (
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'status'}
                            direction={
                              sortBy === 'status' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('status')}
                          >
                            Status
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {columnVisibility.createdAt && (
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'createdAt'}
                            direction={
                              sortBy === 'createdAt' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('createdAt')}
                          >
                            Created At
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {columnVisibility.updatedAt && (
                        <TableCell>Updated At</TableCell>
                      )}
                      {columnVisibility.actions && (
                        <TableCell>Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCenters.map((center) => {
                      const archiveProps = getArchiveButtonProps(center);
                      return (
                        <TableRow key={center.cohortId} hover>
                          {columnVisibility.name && (
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    
                                  }}
                                />
                                <Typography variant="body2" fontWeight="medium">
                                  {getDisplayValue(center.name)}
                                </Typography>
                              </Box>
                            </TableCell>
                          )}
                          {columnVisibility.cohortId && (
                            <TableCell>
                              <Tooltip title={center.cohortId}>
                                <Chip
                                  label={
                                    center.cohortId.substring(0, 8) + '...'
                                  }
                                  size="small"
                                  variant="outlined"
                                />
                              </Tooltip>
                            </TableCell>
                          )}
                          {columnVisibility.parentId && (
                            <TableCell>
                              <Typography variant="body2">
                                {schools.find(
                                  (s) => s.cohortId === center.parentId
                                )?.name ||
                                  center.parentId.substring(0, 8) + '...'}
                              </Typography>
                            </TableCell>
                          )}
                         
                          {columnVisibility.status && (
                            <TableCell>
                        
   <Chip
                                label={getStatusText(center.status)}
                                size="small"
                                color={getStatusColor(center.status) as any}
                                icon={
                                  getStatusIcon(center.status) || undefined
                                }
                                variant="outlined"
                              />
                              
                            </TableCell>
                          )}
                          {columnVisibility.createdAt && (
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {formatDate(center.createdAt)}
                              </Typography>
                            </TableCell>
                          )}
                          {columnVisibility.updatedAt && (
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {formatDate(center.updatedAt)}
                              </Typography>
                            </TableCell>
                          )}
                          {columnVisibility.actions && (
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="Add Students">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenAddStudents(center)
                                    }
                                    color="primary"
                                  >
                                    <PersonAddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Class">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditCenter(center)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={archiveProps.tooltip}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleArchiveCenter(center)}
                                    color={archiveProps.color}
                                    sx={{
                                      ...(center.status === 'active' && {
                                        '&:hover': {
                                          backgroundColor: '#ffebee',
                                        },
                                      }),
                                      ...(center.status === 'archived' && {
                                        '&:hover': {
                                          backgroundColor: '#f5f5f5',
                                        },
                                      }),
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Rows per page:
                    </Typography>
                    <Select
                      size="small"
                      value={pagination.limit.toString()}
                      onChange={handleRowsPerPageChange}
                      sx={{ minWidth: 80 }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </Select>
                    <Typography variant="body2" color="textSecondary">
                      {pagination.page * pagination.limit + 1}-
                      {Math.min(
                        (pagination.page + 1) * pagination.limit,
                        pagination.total
                      )}{' '}
                      of {pagination.total}
                    </Typography>
                  </Box>

                  <Pagination
                    count={Math.ceil(pagination.total / pagination.limit)}
                    page={pagination.page + 1}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>

      {/* Center Form Dialog */}
      {openForm && (
        <CenterForm
          open={openForm}
          onClose={() => setOpenForm(false)}
          onSubmit={handleFormSubmit}
          center={editingCenter}
        />
      )}

      {/* Archive/Unarchive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={handleCancelArchive}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {centerToUpdate?.status === 'active'
            ? 'Archive Class'
            : 'Activate Class'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {centerToUpdate?.status === 'active'
              ? `Are you sure you want to archive the class "${centerToUpdate?.name}"?`
              : `Are you sure you want to activate the class "${centerToUpdate?.name}"?`}
          </Typography>
          {centerToUpdate?.status === 'active' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Archived classes will be hidden from active view and marked as
              inactive.
            </Alert>
          )}
          {centerToUpdate?.status === 'archived' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Activating this class will make it visible and available for use.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelArchive} disabled={archiveLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmArchive}
            variant="contained"
            disabled={archiveLoading}
            sx={{
              ...(centerToUpdate?.status === 'active' && {
                backgroundColor: '#d32f2f',
                '&:hover': { backgroundColor: '#c62828' },
              }),
              ...(centerToUpdate?.status === 'archived' && {
                backgroundColor: '#1976d2',
                '&:hover': { backgroundColor: '#1565c0' },
              }),
            }}
          >
            {archiveLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : centerToUpdate?.status === 'active' ? (
              'Archive'
            ) : (
              'Activate'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Students Dialog */}
      <Dialog
        open={openAddStudentsDialog}
        onClose={handleCloseAddStudents}
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6">
              Add Students to {selectedClass?.name}
            </Typography>
            <IconButton onClick={handleCloseAddStudents} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Cluster</InputLabel>
                <Select
                  value={dialogCluster}
                  label="Select Cluster"
                  onChange={handleDialogClusterChange}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {clusters.map((cluster) => (
                    <MenuItem key={cluster.cohortId} value={cluster.cohortId}>
                      {cluster.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{ minWidth: 200 }}
                disabled={!dialogCluster}
              >
                <InputLabel>Select School</InputLabel>
                <Select
                  value={dialogSchool}
                  label="Select School"
                  onChange={handleDialogSchoolChange}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {dialogSchools.map((school) => (
                    <MenuItem key={school.cohortId} value={school.cohortId}>
                      {school.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{ minWidth: 200 }}
                disabled={!dialogSchool}
              >
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={dialogClass}
                  label="Select Class"
                  onChange={handleDialogClassChange}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {dialogClasses.map((cls) => (
                    <MenuItem key={cls.cohortId} value={cls.cohortId}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Student List - Always show, either global (filtered by target) or from selected source class */}
            <Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search students..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    sx={{ flexGrow: 1, minWidth: 200 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSelectAllStudents}
                      disabled={filteredStudents.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleDeselectAllStudents}
                      disabled={selectedStudents.length === 0}
                    >
                      Deselect All
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {loadingStudents ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', p: 3 }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : filteredStudents.length === 0 ? (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="body2" color="textSecondary">
                          {dialogClass && students.length === 0
                            ? 'No students found in the selected source class'
                            : students.length === 0
                            ? 'No available students found'
                            : 'No students match your search'}
                        </Typography>
                        {!dialogClass && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ mt: 1, display: 'block' }}
                          >
                            Showing all active students who are not already in {selectedClass?.name}
                          </Typography>
                        )}
                    </Box>
                  ) : (
                    <Paper
                      sx={{ width: '100%', mb: 2, maxHeight: 400, overflow: 'auto' }}
                      onScroll={(e) => {
                          const target = e.currentTarget;
                          if (
                              target.scrollHeight - target.scrollTop <= target.clientHeight + 20 &&
                              !customLoading && 
                              !loadingStudents &&
                              hasMoreStudents && 
                              !dialogClass // Infinite scroll mainly for Global mode (when no source class specific)
                          ) {
                              const nextOffset = studentOffset + 100;
                              setStudentOffset(nextOffset);
                              console.log("Loading more students... Offset:", nextOffset);
                              fetchStudents(undefined, selectedClass?.cohortId, studentSearchTerm, nextOffset, true);
                          }
                      }}
                    >
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={
                                  filteredStudents.length > 0 &&
                                  selectedStudents.length ===
                                    filteredStudents.length
                                }
                                indeterminate={
                                  selectedStudents.length > 0 &&
                                  selectedStudents.length <
                                    filteredStudents.length
                                }
                                onChange={(e) =>
                                  e.target.checked
                                    ? handleSelectAllStudents()
                                    : handleDeselectAllStudents()
                                }
                              />
                            </TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredStudents.map((student) => (
                            <TableRow
                              key={student.userId}
                              hover
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedStudents.includes(
                                    student.userId
                                  )}
                                  onChange={() =>
                                    handleStudentToggle(student.userId)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {`${student.firstName} ${student.lastName}`}
                              </TableCell>
                              <TableCell>
                                {student.email ? student.email : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    student.status.charAt(0).toUpperCase() +
                                    student.status.slice(1)
                                  }
                                  size="small"
                                  color={
                                    student.status === 'active'
                                      ? 'success'
                                      : student.status === 'inactive'
                                      ? 'error'
                                      : 'warning'
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                            {customLoading && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                      </Table>
                    </Paper>
                  )}
                </Box>

                {selectedStudents.length > 0 && (
                  <Alert severity="info">
                    {selectedStudents.length} student(s) selected for{' '}
                    {dialogClass
                      ? dialogClasses.find((c) => c.cohortId === dialogClass)
                          ?.name || 'filtered class'
                      : selectedClass?.name}
                  </Alert>
                )}

            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetDialog} color="inherit">
            Reset
          </Button>
          <Button onClick={handleCloseAddStudents} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleApplyStudents}
            variant="contained"
            disabled={selectedStudents.length === 0 || addingStudents}
            startIcon={
              addingStudents ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {addingStudents
              ? 'Adding...'
              : `Apply (${selectedStudents.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Centers;
/* eslint-disable @nx/enforce-module-boundaries */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { debounce } from 'lodash';
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
  Avatar,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  FilterAlt as FilterIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Sort as SortIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  School as SchoolIcon,
    CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  getCohortMemberList,
  getCohortList,
  assignClassToTeacher,
  updateCohortMemberStatus,
  updateCohortUpdate,
  getUserCohorts,
} from '../services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import AddTeacherModal from '@/components/AddTeacherModal';
import EditUserModal from '@/components/EditUserModal';
import { deleteUser } from '@/services/UserService';
import { userList } from '@/services/UserList';

// Define types based on API response
interface Teacher {
  userId: string;
  enrollmentId: string | null;
  username: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  role: string;
  mobile: string | null;
  deviceId: string | null;
  status: 'active' | 'inactive' | 'pending' | 'archived';
  statusReason: string | null;
  cohortMembershipId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string | null;
  customField: any[];
}

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

interface ClassAssignment {
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  clusterId: string;
  clusterName: string;
  assigned: boolean;
  originallyAssigned: boolean;
  membershipId?: string;
}

// Define sortable columns
type SortableColumn = 'firstName' | 'username' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

const TeacherList = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    archived: 0,
    inactive: 0,
    pending: 0,
  });
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'pending' | 'archived'
  >('all');
  const [selectedCluster, setSelectedCluster] = useState('All');
  const [clusters, setClusters] = useState<CohortCenter[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [schools, setSchools] = useState<CohortCenter[]>([]);
  const [selectedClass, setSelectedClass] = useState('All');
  const [classes, setClasses] = useState<CohortCenter[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    username: true,
    role: true,
    status: true,
    mobile: true,
    createdAt: true,
    actions: true,
  });

  // Assign Class Dialog State
  const [assignClassDialogOpen, setAssignClassDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>(
    []
  );
  const [assignLoading, setAssignLoading] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(
    new Set()
  );
  const [selectedAssignmentCenter, setSelectedAssignmentCenter] = useState<string>('');
  const [selectedAssignmentCluster, setSelectedAssignmentCluster] = useState<string>('');


  // Archive/Unarchive Dialog State
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [teacherToUpdate, setTeacherToUpdate] = useState<Teacher | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Edit Teacher Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<SortableColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Fetch schools from API - FIXED: Use empty string for "All"
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

      const response: any = await getCohortList(schoolRequestData as any);

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

  // Fetch classes from API - FIXED: Use empty string for "All"
  const fetchClasses = useCallback(async (schoolId?: string) => {
    try {
      const classRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'COHORT',
          status: ['active'],
          ...(schoolId && schoolId !== 'All' && { parentId: [schoolId] }),
        },
      };

      const response: any = await getCohortList(classRequestData as any);

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
    }
  }, []);

  // Fetch teachers from API - FIXED: Handle empty string for "All"
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const tenantId = localStorage.getItem('tenantId') || undefined;
      const baseFilters: Record<string, any> = {
        role: 'Teacher',
        tenantId,
        ...(selectedClass !== 'All' && { cohortId: selectedClass }),
        ...(statusFilter !== 'all' && { status: [statusFilter] }),
      };

      const searchValue = searchTerm.trim();
      const baseRequest = {
        limit: pagination.limit,
        offset: pagination.page * pagination.limit,
        sort: [sortBy, sortDirection],
      };

      let response: any = null;

      if (searchValue) {
        // First try searching by firstName
        const firstNameReq = {
          ...baseRequest,
          filters: { ...baseFilters, firstName: searchValue },
        };
        response = await userList(firstNameReq);
        const totalFirst = response?.totalCount || 0;
        const detailsFirst = response?.getUserDetails || [];
        if (totalFirst === 0 || detailsFirst.length === 0) {
          // Then try username
          const usernameReq = {
            ...baseRequest,
            filters: { ...baseFilters, username: searchValue },
          };
          response = await userList(usernameReq);
        }
      } else {
        // No search term: regular load
        response = await userList({
          ...baseRequest,
          filters: baseFilters,
        });
      }

      if (response && typeof response === 'object') {
        if (response.getUserDetails) {
          const teachersData = response.getUserDetails;
          const totalCount = response.totalCount || teachersData.length;

          console.log(
            `Fetched ${teachersData.length} teachers, status filter: ${statusFilter}`
          );

          setTeachers(teachersData);
          setPagination((prev) => ({
            ...prev,
            total: totalCount,
          }));
        } else if (Array.isArray(response)) {
          setTeachers(response);
          setPagination((prev) => ({
            ...prev,
            total: response.length,
          }));
        } else {
          setTeachers([]);
          setPagination((prev) => ({ ...prev, total: 0 }));
        }
      } else if (typeof response === 'object' && 'message' in response) {
        throw new Error(response.message as string);
      } else {
        setTeachers([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
      const errorMessage =
        err.message || 'Failed to fetch teachers from server';
      setError(errorMessage);
      showToastMessage(errorMessage, 'error');

      setTeachers([]);
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
    selectedClass,
    searchTerm,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchClusters();
    fetchSchools();
    fetchClasses();
  }, [fetchClusters, fetchSchools, fetchClasses]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Helper function to fetch all paginated data
  const fetchAllPaginatedData = useCallback(async (
    type: string,
    additionalFilters: Record<string, any> = {}
  ): Promise<any[]> => {
    const batchSize = 200; // Fetch in batches of 200
    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const requestData = {
          limit: batchSize,
          offset: offset,
          filters: {
            type,
            status: ['active'],
            ...additionalFilters,
          },
        };

        const response: any = await getCohortList(requestData as any);
        const data = response?.results?.cohortDetails || [];
        
        if (data.length > 0) {
          allData = [...allData, ...data];
          offset += batchSize;
          // If we got less than batchSize, we've reached the end
          if (data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error(`Error fetching paginated ${type} data:`, err);
        hasMore = false;
      }
    }

    console.log(`Total ${type} items fetched:`, allData.length);
    return allData;
  }, []);

  // Fetch all classes and schools for assignment dialog using Promise.all
  const fetchAllClassesForAssignment = useCallback(
    async (teacherId?: string) => {
      try {
        // Fetch classes and schools in parallel using Promise.all
        const [allClasses, allSchools] = await Promise.all([
          fetchAllPaginatedData('COHORT'),
          fetchAllPaginatedData('SCHOOL'),
        ]);

        console.log('All classes fetched for assignment:', allClasses.length);
        console.log('All schools fetched:', allSchools.length);

        // Create a map for quick school name lookup
        const schoolMap = new Map<string, string>();
        allSchools.forEach((school: any) => {
          if (school.cohortId) {
            schoolMap.set(school.cohortId, school.name);
          }
        });

        // If we have a teacherId, we need to fetch their current classes
        let teacherCurrentClassesMap = new Map<string, string>(); // cohortId -> membershipId
        if (teacherId) {
          try {
            // Fetch teacher's current cohort memberships using getUserCohorts
            const teacherCohorts = await getUserCohorts(teacherId);
            console.log('Teacher cohorts response:', teacherCohorts);

            // Handle various response formats
            let cohortsArray: any[] = [];
            
            if (Array.isArray(teacherCohorts)) {
              cohortsArray = teacherCohorts;
            } else if (teacherCohorts?.cohortData && Array.isArray(teacherCohorts.cohortData)) {
              cohortsArray = teacherCohorts.cohortData;
            } else if (teacherCohorts?.result && Array.isArray(teacherCohorts.result)) {
              cohortsArray = teacherCohorts.result;
            }
            
            // Extract cohortIds from the array
            cohortsArray.forEach((cohort: any) => {
                 if ((cohort.cohortId || cohort.id) && cohort.cohortMemberStatus !== 'archived') {
                     const cId = cohort.cohortId || cohort.id;
                     const mId = cohort.cohortMembershipId || cohort.membershipId; // Ensure we capture membershipId if available
                     if (cId) {
                         teacherCurrentClassesMap.set(String(cId).toLowerCase(), mId);
                     }
                 }
            });
            
            console.log('Teacher current classes extracted (excluding archived):', teacherCurrentClassesMap.keys());
          } catch (err) {
            console.error('Error fetching teacher current classes:', err);
          }
        }

        // Transform classes to ClassAssignment format
        const assignments: ClassAssignment[] = allClasses.map((cls: any) => {
          const schoolName = schoolMap.get(cls.parentId) || 'Unknown School';
          const normalizedId = String(cls.cohortId).toLowerCase();
          const isAssigned = teacherCurrentClassesMap.has(normalizedId);
          const membershipId = teacherCurrentClassesMap.get(normalizedId);
          
          return {
            classId: cls.cohortId,
            className: cls.name,
            schoolId: cls.parentId || '',
            schoolName: schoolName,
            clusterId: '',
            clusterName: '',
            assigned: isAssigned,
            originallyAssigned: isAssigned,
            membershipId: membershipId // Store for unassignment
          };
        });

        console.log('Assignments created:', assignments.length);
        return assignments;
      } catch (err) {
        console.error('Error fetching all classes for assignment:', err);
        return [];
      }
    },
    [fetchAllPaginatedData]
  );

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Handle status filter change - ADDED "ALL" OPTION
  const handleStatusChange = (
    event: React.MouseEvent<HTMLElement>,
    newStatus: 'all' | 'active' | 'inactive' | 'pending' | 'archived'
  ) => {
    if (newStatus !== null) {
      setStatusFilter(newStatus);
      setPagination((prev) => ({ ...prev, page: 0 }));
    }
  };

  // Handle cluster filter
  const handleClusterChange = (event: SelectChangeEvent) => {
    const newCluster = event.target.value;
    setSelectedCluster(newCluster);
    setSelectedSchool('All');
    setSelectedClass('All');

    if (newCluster === 'All') {
      fetchSchools();
      fetchClasses();
    } else {
      fetchSchools(newCluster);
      setClasses([]);
    }
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  // Handle school filter
  const handleSchoolChange = (event: SelectChangeEvent) => {
    const newSchool = event.target.value;
    setSelectedSchool(newSchool);
    setSelectedClass('All');

    if (newSchool === 'All') {
      fetchClasses();
    } else {
      fetchClasses(newSchool);
    }
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  // Handle class filter
  const handleClassChange = (event: SelectChangeEvent) => {
    setSelectedClass(event.target.value);
    setPagination((prev) => ({ ...prev, page: 0 }));
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

  // Handle add teacher
  const handleAddTeacher = () => {
    setOpenForm(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setTeacherToEdit(teacher);
    setEditModalOpen(true);
  };

  // Handle archive/unarchive teacher
  const handleArchiveTeacher = (teacher: Teacher) => {
    setTeacherToUpdate(teacher);
    setArchiveDialogOpen(true);
  };

  // Confirm archive/unarchive - FIXED VERSION
  const handleConfirmArchive = async () => {
    if (!teacherToUpdate) return;

    setArchiveLoading(true);
    try {
      const newStatus =
        teacherToUpdate.status === 'active' ? 'archived' : 'active';

      console.log('Current teacher status:', teacherToUpdate.status);
      console.log('New status to set:', newStatus);
      console.log('Teacher ID:', teacherToUpdate.userId);

      const updateData = {
        status: newStatus,
        type: 'Teacher',
      };

      const response = await deleteUser(teacherToUpdate.userId, {
        userData: updateData,
      });

      console.log('API Response:', response);

      if (response?.responseCode === 200 || response?.success) {
        // CRITICAL FIX: Immediately update the local state
        const updatedTeacher = {
          ...teacherToUpdate,
          status: newStatus as 'active' | 'archived',
        };

        // Update the teachers array
        setTeachers((prev) =>
          prev.map((teacher) =>
            teacher.userId === teacherToUpdate.userId ? updatedTeacher : teacher
          )
        );

        const action = newStatus === 'archived' ? 'archived' : 'activated';
        const message =
          newStatus === 'archived'
            ? 'Teacher archived successfully'
            : 'Teacher activated successfully';

        showToastMessage(message, 'success');
        setSnackbar({
          open: true,
          message,
          severity: 'success',
        });

        // If the current filter doesn't match the new status, refresh the list
        // if (
        //   (statusFilter === 'active' && newStatus === 'archived') ||
        //   (statusFilter === 'archived' && newStatus === 'active')
        // ) {
        //   setTimeout(() => {
        //     fetchTeachers();
        //   }, 500);
        // }
      } else {
        throw new Error(response?.message || 'Failed to update teacher status');
      }
    } catch (err: any) {
      console.error('Error updating teacher status:', err);
      const errorMessage = err.message || 'Failed to update teacher status';
      showToastMessage(errorMessage, 'error');
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setArchiveLoading(false);
      setArchiveDialogOpen(false);
      setTeacherToUpdate(null);
    }
  };

  const handleCancelArchive = () => {
    setArchiveDialogOpen(false);
    setTeacherToUpdate(null);
  };

  // Handle assign class click - FIXED VERSION
  const handleAssignClassClick = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setAssignLoading(true);
    setAssignClassDialogOpen(true);
    setSelectedAssignmentCenter(''); // Reset center filter
    setSelectedAssignmentCluster(''); // Reset cluster filter

    try {
      console.log('Fetching classes for teacher:', teacher.userId);
      const assignments = await fetchAllClassesForAssignment(teacher.userId);

      setClassAssignments(assignments);

      // Auto-expand schools that have assigned classes
      const schoolsWithAssignments = new Set<string>();
      assignments.forEach((cls) => {
        if (cls.assigned) {
          const schoolId = cls.schoolId || 'unknown';
          schoolsWithAssignments.add(schoolId);
        }
      });
      setExpandedSchools(schoolsWithAssignments);

      console.log('Expanded schools:', Array.from(schoolsWithAssignments));
    } catch (err) {
      console.error('Error loading classes for assignment:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load classes. Please try again.',
        severity: 'error',
      });
      setClassAssignments([]);
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle assign class dialog close
  const handleAssignClassDialogClose = () => {
    setAssignClassDialogOpen(false);
    setSelectedTeacher(null);
    setClassAssignments([]);
    setExpandedSchools(new Set());
    setSelectedAssignmentCenter('');
    setSelectedAssignmentCluster('');
  };

  // Handle clear assignment cluster filter
  const handleClearAssignmentCluster = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedAssignmentCluster('');
    setSelectedAssignmentCenter('');
  };

  // Handle clear assignment center filter
  const handleClearAssignmentCenter = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedAssignmentCenter('');
  };

  // Handle class checkbox change
  // Handle class checkbox change
  const handleClassCheckboxChange = (classId: string) => {
    setClassAssignments((prev) =>
      prev.map((cls) => {
        if (cls.classId === classId) {
          // Allow toggling even if originally assigned
          return { ...cls, assigned: !cls.assigned };
        }
        return cls;
      })
    );
  };

  // Handle school expand/collapse
  const handleSchoolToggle = (schoolId: string) => {
    setExpandedSchools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(schoolId)) {
        newSet.delete(schoolId);
      } else {
        newSet.add(schoolId);
      }
      return newSet;
    });
  };

  // Check if any classes are selected
  const hasSelectedClasses = useMemo(() => {
    return classAssignments.some((cls) => cls.assigned);
  }, [classAssignments]);

  // Handle save assignments - FIXED VERSION
  const handleSaveAssignments = async () => {
    // allow saving if there are changes (additions OR removals), even if hasSelectedClasses is false (removed all)
    // Check if any changes were made
    const hasChanges = classAssignments.some(cls => cls.assigned !== cls.originallyAssigned);

    if (!selectedTeacher || !hasChanges) {
         if (!hasChanges) showToastMessage('No changes to save', 'info');
         return;
    }

    setAssignLoading(true);
    try {
      // 1. Get classes to assign (newly assigned)
      const classesToAssign = classAssignments
        .filter((cls) => cls.assigned && !cls.originallyAssigned)
        .map((cls) => cls.classId);

      // 2. Get classes to unassign (removed)
      const classesToUnassign = classAssignments
        .filter((cls) => !cls.assigned && cls.originallyAssigned);

      console.log(
        'Assigning classes:',
        classesToAssign,
        'Unassigning classes:',
        classesToUnassign.map(c => c.classId),
        'to teacher:',
        selectedTeacher.userId
      );

      // Execute Additions
      if (classesToAssign.length > 0) {
          const response = await assignClassToTeacher({
            userId: [selectedTeacher.userId],
            cohortId: classesToAssign, 
          });
           if (!response?.success && response?.responseCode !== 201) {
              throw new Error(response?.message || 'Failed to assign some classes');
           }
      }

      // Execute Removals
      if (classesToUnassign.length > 0) {
           const removePromises = classesToUnassign.map(async (cls) => {
              if (cls.membershipId) {
                  return updateCohortMemberStatus({
                      membershipId: cls.membershipId,
                      memberStatus: 'archived',
                      statusReason: 'Unassigned by admin'
                  });
              } else {
                  console.warn(`Cannot unassign class ${cls.className} - missing membershipId`);
                  // Fallback: Use new API if exists or log error. 
                  // If we don't have membershipID, we might fail.
                  return Promise.resolve({ success: false, message: "Missing membership ID" });
              }
          });
          await Promise.all(removePromises);
      }

      const message = `Class assignments updated successfully`;
      showToastMessage(message, 'success');

      setSnackbar({
          open: true,
          message,
          severity: 'success',
      });

      handleAssignClassDialogClose();
      fetchTeachers(); // Refresh the teacher list
      
    } catch (err: any) {
      console.error('Error updating class assignments:', err);

      // Extract error message
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to update class assignments. Please try again.';

      showToastMessage(errorMessage, 'error');

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchTeachers();
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

  // Debounced search (server-side, sequential like learners)
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        const trimmed = value.trim();
        setPagination((prev) => ({ ...prev, page: 0 }));
        setSearchTerm(trimmed);
      }, 400),
    []
  );

  // Filtered list (server-side search already applied)
  const filteredTeachers = teachers;

  // Calculate stats (use summary counts)
  const { total, active, archived, inactive, pending } = summaryCounts;

  // Format date
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString || 'N/A';
    }
  };
useEffect(() => {
  const fetchTeacherSummaryCounts = async () => {
    try {
      const baseParams = {
        limit: 1, // minimal data
        offset: 0,
        sort: ['createdAt', 'asc'] as any,
      };

      const totalResp = await userList({
        ...baseParams,
        filters: { role: 'Teacher' },
      });

      const activeResp = await userList({
        ...baseParams,
        filters: { role: 'Teacher', status: 'active' },
      });

      const archivedResp = await userList({
        ...baseParams,
        filters: { role: 'Teacher', status: 'archived' },
      });

      const pendingResp = await userList({
        ...baseParams,
        filters: { role: 'Teacher', status: 'pending' },
      });

      setSummaryCounts({
        total: totalResp?.totalCount || 0,
        active: activeResp?.totalCount || 0,
        archived: archivedResp?.totalCount || 0,
        pending: pendingResp?.totalCount || 0,
        inactive: archivedResp?.totalCount || 0,
      });
    } catch (e) {
      console.error('Error fetching teacher summary counts', e);
    }
  };

  fetchTeacherSummaryCounts();
}, []);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      case 'archived':
        return 'default';
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

  // Get full name
  const getFullName = (teacher: Teacher) => {
    return `${teacher.firstName} ${teacher.lastName}`.trim();
  };

  // Get initials for avatar
  const getInitials = (teacher: Teacher) => {
    return `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(
      0
    )}`.toUpperCase();
  };

  // Get archive/unarchive button props - FIXED
  const getArchiveButtonProps = (teacher: Teacher) => {
    if (teacher.status === 'active') {
      return {
        color: 'error' as const,
        tooltip: 'Archive Teacher',
      };
    } else if (teacher.status === 'archived') {
      return {
        color: 'success' as const, // Changed to success for better visibility
        tooltip: 'Activate Teacher',
      };
    } else {
      return {
        color: 'warning' as const,
        tooltip: 'Update Status',
      };
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Group classes by school for the assign class dialog
  const groupedClasses = useMemo(() => {
    const groups: Record<string, ClassAssignment[]> = {};
    
    // Get school IDs that belong to the selected cluster
    const schoolIdsInCluster = selectedAssignmentCluster
      ? new Set(
          schools
            .filter((school) => school.parentId === selectedAssignmentCluster)
            .map((school) => school.cohortId)
        )
      : null;
    
    classAssignments.forEach((cls) => {
      // Filter by cluster if selected
      if (schoolIdsInCluster && !schoolIdsInCluster.has(cls.schoolId)) {
        return;
      }
      
      // Filter by center if selected
      if (
        selectedAssignmentCenter &&
        selectedAssignmentCenter !== '' &&
        selectedAssignmentCenter !== 'All' &&
        cls.schoolId !== selectedAssignmentCenter
      ) {
        return;
      }
      const schoolId = cls.schoolId || 'unknown';
      if (!groups[schoolId]) {
        groups[schoolId] = [];
      }
      groups[schoolId].push(cls);
    });
    return groups;
  }, [classAssignments, selectedAssignmentCenter, selectedAssignmentCluster, schools]);

  // Derive unique clusters for dropdown
  const uniqueAssignmentClusters = useMemo(() => {
    const clustersMap = new Map<string, string>();
    // Get clusters from the existing clusters state
    clusters.forEach((cluster) => {
      if (cluster.cohortId && cluster.name) {
        clustersMap.set(cluster.cohortId, cluster.name);
      }
    });
    return Array.from(clustersMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [clusters]);

  // Derive unique schools for dropdown - filter by selected cluster if any
  const uniqueAssignmentSchools = useMemo(() => {
    const schoolsMap = new Map<string, string>();
    // Filter schools based on selected cluster
    const filteredSchools = selectedAssignmentCluster
      ? schools.filter((school) => school.parentId === selectedAssignmentCluster)
      : schools;
    
    filteredSchools.forEach((school) => {
      if (school.cohortId && school.name) {
        schoolsMap.set(school.cohortId, school.name);
      }
    });
    return Array.from(schoolsMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [schools, selectedAssignmentCluster]);

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
              Teachers
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage all teachers and their assignments
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
              onClick={handleAddTeacher}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
            >
              Add Teacher
            </Button>
          </Box>
        </Box>

        {/* Stats Cards - UPDATED LABEL */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card
            sx={{
              flex: 1,
              minWidth: 200,
              borderLeft: '4px solid #1976d2',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Teachers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card
            sx={{
              flex: 1,
              minWidth: 200,
              borderLeft: '4px solid #4caf50',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupIcon sx={{ fontSize: 40, color: '#4caf50' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {active}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Teachers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card
            sx={{
              flex: 1,
              minWidth: 200,
              borderLeft: '4px solid #ff9800',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {archived}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Archived Teachers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          {pending > 0 && (
            <Card
              sx={{
                flex: 1,
                minWidth: 200,
                borderLeft: '4px solid #ff9800',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <GroupIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {pending}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pending Teachers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filter Section - ADDED "ALL" OPTION */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusChange}
                size="small"
              >
                <ToggleButton
                  value="all"
                  sx={{
                    color: 'primary.main',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.main',
                    },
                  }}
                >
                  <Typography variant="body2">All</Typography>
                </ToggleButton>
                <ToggleButton
                  value="active"
                  sx={{
                    color: '#4caf50',
                    '&.Mui-selected': {
                      backgroundColor: '#e8f5e8',
                      color: '#4caf50',
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
                  <Typography variant="body2">Archived</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box> */}

            {/* <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Cluster</InputLabel>
              <Select
                value={selectedCluster}
                label="Filter by Cluster"
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

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by School</InputLabel>
              <Select
                value={selectedSchool}
                label="Filter by School"
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

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Class</InputLabel>
              <Select
                value={selectedClass}
                label="Filter by Class"
                onChange={handleClassChange}
              >
                <MenuItem value="All">-</MenuItem>
                {classes.map((cls) => (
                  <MenuItem key={cls.cohortId} value={cls.cohortId}>
                    {cls.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl> */}

            <Box sx={{ flexGrow: 1, maxWidth: 300 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search teachers by name, username..."
                defaultValue={searchTerm}
                onChange={(e) => debouncedSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Teachers Table */}
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
          ) : filteredTeachers.length === 0 ? (
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
                No Teachers Found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchTerm || statusFilter !== 'all' || selectedClass !== 'All'
                  ? 'Try adjusting your search or filters'
                  : 'No teachers available. Try adding a new teacher.'}
              </Typography>
              {statusFilter === 'archived' && (
                <Alert severity="info">
                  No archived teachers found. Archived teachers will appear here
                  when you archive active teachers.
                </Alert>
              )}
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
                            active={sortBy === 'firstName'}
                            direction={
                              sortBy === 'firstName' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('firstName')}
                          >
                            Teacher Name
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {columnVisibility.username && (
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'username'}
                            direction={
                              sortBy === 'username' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('username')}
                          >
                            Username
                          </TableSortLabel>
                        </TableCell>
                      )}
                      
                      {columnVisibility.mobile && (
                        <TableCell>Contact</TableCell>
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
                 
                      {columnVisibility.actions && (
                        <TableCell>Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTeachers.map((teacher) => {
                      const archiveProps = getArchiveButtonProps(teacher);
                      return (
                        <TableRow key={teacher.userId} hover>
                          {columnVisibility.name && (
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor:
                                      teacher.status === 'archived'
                                        ? '#757575'
                                        : '#1976d2',
                                  }}
                                >
                                  {getInitials(teacher)}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight="medium"
                                  >
                                    {getFullName(teacher)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    ID: {teacher.userId.substring(0, 8)}...
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                          )}
                          {columnVisibility.username && (
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <BadgeIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {teacher.username}
                                </Typography>
                              </Box>
                            </TableCell>
                          )}
                     
                          {columnVisibility.mobile && (
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                {teacher.mobile ? (
                                  <>
                                    <PhoneIcon
                                      fontSize="small"
                                      color="action"
                                    />
                                    <Typography variant="body2">
                                      {teacher.mobile}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    N/A
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                          )}
                          {columnVisibility.status && (
                            <TableCell>
                                <Chip
                                label={getStatusText(teacher.status)}
                                size="small"
                                color={getStatusColor(teacher.status) as any}
                                icon={
                                  getStatusIcon(teacher.status) || undefined
                                }
                                variant="outlined"
                              />
                            </TableCell>
                          )}
                    
                          {columnVisibility.actions && (
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {teacher.status === 'archived' ? (
                                  // Only show delete icon for archived
                                  <Tooltip title={archiveProps.tooltip}>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleArchiveTeacher(teacher)
                                      }
                                      color={archiveProps.color}
                                      sx={{
                                        '&:hover': {
                                          backgroundColor: '#e8f5e8',
                                        },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                   // Show all action buttons for active/non-archived
                                  <>
                                    <Tooltip title="Assign Class">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleAssignClassClick(teacher)
                                        }
                                        color="primary"
                                      >
                                        <AssignmentIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit Teacher">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditTeacher(teacher)}
                                        // color="primary"
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title={archiveProps.tooltip}>
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleArchiveTeacher(teacher)
                                        }
                                        color={archiveProps.color}
                                        sx={{
                                          '&:hover': {
                                            backgroundColor: '#ffebee',
                                          },
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination - only show if we have multiple pages */}
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

      {/* Teacher Form Dialog */}
      <AddTeacherModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSuccess={handleRefresh}
      />

      {/* Assign Class Dialog */}
      <Dialog
        open={assignClassDialogOpen}
        onClose={handleAssignClassDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            Assign Classes to {selectedTeacher?.firstName}{' '}
            {selectedTeacher?.lastName}
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: 0,
          }}
        >
          {assignLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 2,
              }}
            >
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Select or deselect classes for this teacher
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                {/* Search by Cluster Filter */}
                <Box sx={{ flex: 1, minWidth: 200, position: 'relative' }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Search by Cluster</InputLabel>
                    <Select
                      value={selectedAssignmentCluster}
                      label="Search by Cluster"
                      onChange={(e) => {
                        setSelectedAssignmentCluster(e.target.value);
                        setSelectedAssignmentCenter(''); // Reset center when cluster changes
                      }}
                      sx={{
                        '& .MuiSelect-select': {
                          paddingRight: selectedAssignmentCluster ? '50px' : undefined,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>All Clusters</em>
                      </MenuItem>
                      {uniqueAssignmentClusters.map((cluster) => (
                        <MenuItem key={cluster.id} value={cluster.id}>
                          {cluster.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedAssignmentCluster && (
                    <IconButton
                      size="small"
                      onClick={handleClearAssignmentCluster}
                      sx={{
                        position: 'absolute',
                        right: 30,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1,
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {/* Search by Center Filter */}
                <Box sx={{ flex: 1, minWidth: 200, position: 'relative' }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Search by Center</InputLabel>
                    <Select
                      value={selectedAssignmentCenter}
                      label="Search by Center"
                      onChange={(e) => setSelectedAssignmentCenter(e.target.value)}
                      sx={{
                        '& .MuiSelect-select': {
                          paddingRight: selectedAssignmentCenter ? '50px' : undefined,
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>All Centers</em>
                      </MenuItem>
                      {uniqueAssignmentSchools.map((school) => (
                        <MenuItem key={school.id} value={school.id}>
                          {school.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedAssignmentCenter && (
                    <IconButton
                      size="small"
                      onClick={handleClearAssignmentCenter}
                      sx={{
                        position: 'absolute',
                        right: 30,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1,
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Add bulk action buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const allSchoolIds = Object.keys(groupedClasses);
                    setExpandedSchools(new Set(allSchoolIds));
                  }}
                  disabled={Object.keys(groupedClasses).length === 0}
                >
                  Expand All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setExpandedSchools(new Set())}
                  disabled={Object.keys(groupedClasses).length === 0}
                >
                  Collapse All
                </Button>
              </Box>

              {/* Scrollable content area */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minHeight: 200,
                  maxHeight: 400,
                }}
              >
                {Object.keys(groupedClasses).length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: 200,
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      No classes available for assignment
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Make sure classes are created and active
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0,pb:4}}>
                    {Object.entries(groupedClasses).map(
                      ([schoolId, schoolClasses]) => {
                        const schoolName =
                          schoolClasses[0]?.schoolName || 'Unknown School';
                        const isExpanded = expandedSchools.has(schoolId);

                        // Count assigned classes in this school
                        const assignedCount = schoolClasses.filter(
                          (cls) => cls.assigned
                        ).length;
                        const totalCount = schoolClasses.length;

                        return (
                          <React.Fragment key={schoolId}>
                            <ListItem
                              disablePadding
                              secondaryAction={
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  {assignedCount > 0 && (
                                    <Chip
                                      label={`${assignedCount}/${totalCount}`}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                  <IconButton
                                    edge="end"
                                    onClick={() => handleSchoolToggle(schoolId)}
                                    size="small"
                                  >
                                    {isExpanded ? (
                                      <ExpandLessIcon />
                                    ) : (
                                      <ExpandMoreIcon />
                                    )}
                                  </IconButton>
                                </Box>
                              }
                            >
                              <ListItemButton
                                onClick={() => handleSchoolToggle(schoolId)}
                                sx={{ py: 1 }}
                              >
                                <ListItemIcon>
                                  <SchoolIcon />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography fontWeight="medium">
                                      {schoolName}
                                    </Typography>
                                  }
                                  secondary={`${totalCount} class(es)`}
                                />
                              </ListItemButton>
                            </ListItem>

                            {isExpanded && (
                              <List
                                sx={{
                                  pl: 4,
                                  bgcolor: 'action.hover',
                                  borderRadius: 1,
                                  mx: 2,
                                  mb: 1,
                                }}
                              >
                                {schoolClasses.map((cls) => (
                                  <ListItem key={cls.classId} disablePadding>
                                    <ListItemButton
                                      dense
                                      onClick={() =>
                                        handleClassCheckboxChange(cls.classId)
                                      }
                                      sx={{
                                        borderRadius: 1,
                                        '&:hover': {
                                          bgcolor: 'action.selected',
                                        },
                                      }}
                                    >
                                      <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Checkbox
                                          edge="start"
                                          checked={cls.assigned}
                                          tabIndex={-1}
                                          disableRipple
                                        />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Typography variant="body2">
                                            {cls.className}
                                          </Typography>
                                        }
                                        secondary={
                                          <Typography
                                            variant="caption"
                                            color="textSecondary"
                                          >
                                            Class ID:{' '}
                                            {cls.classId.substring(0, 8)}...
                                          </Typography>
                                        }
                                      />
                                      {cls.assigned && (
                                        <Box sx={{ ml: 1 }}>
                                          <Chip
                                            label="Assigned"
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                          />
                                        </Box>
                                      )}
                                    </ListItemButton>
                                  </ListItem>
                                ))}
                              </List>
                            )}
                            <Divider />
                          </React.Fragment>
                        );
                      }
                    )}
                  </List>
                )}
              </Box>

              {/* Summary section */}
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    Selected:{' '}
                    {classAssignments.filter((cls) => cls.assigned).length}{' '}
                    classes
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total: {classAssignments.length} classes
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, flexShrink: 0 }}>
          <Button
            onClick={handleAssignClassDialogClose}
            disabled={assignLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAssignments}
            variant="contained"
            disabled={assignLoading}
            startIcon={assignLoading ? <CircularProgress size={20} /> : null}
          >
            {assignLoading ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Teacher Modal */}
      <EditUserModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={fetchTeachers}
        user={teacherToEdit}
        userType="Teacher"
      />

      {/* Archive/Unarchive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={handleCancelArchive}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {teacherToUpdate?.status === 'active'
            ? 'Archive Teacher'
            : 'Activate Teacher'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor:
                  teacherToUpdate?.status === 'active' ? '#4caf50' : '#ff9800',
                width: 40,
                height: 40,
              }}
            >
              {teacherToUpdate && getInitials(teacherToUpdate)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {teacherToUpdate && getFullName(teacherToUpdate)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {teacherToUpdate?.username}
              </Typography>
              <Chip
                label={getStatusText(teacherToUpdate?.status || '')}
                size="small"
                color={getStatusColor(teacherToUpdate?.status || '') as any}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          <Typography>
            {teacherToUpdate?.status === 'active'
              ? `Are you sure you want to archive this teacher?`
              : `Are you sure you want to activate this teacher?`}
          </Typography>
          {teacherToUpdate?.status === 'active' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Archived teachers will be moved to the "Archived" section and
              won't be able to access the system.
            </Alert>
          )}
          {teacherToUpdate?.status === 'archived' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Activating this teacher will move them back to the "Active"
              section and they'll be able to access the system again.
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
              ...(teacherToUpdate?.status === 'active' && {
                backgroundColor: '#d32f2f',
                '&:hover': { backgroundColor: '#c62828' },
              }),
              ...(teacherToUpdate?.status === 'archived' && {
                backgroundColor: '#1976d2',
                '&:hover': { backgroundColor: '#1565c0' },
              }),
            }}
          >
            {archiveLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : teacherToUpdate?.status === 'active' ? (
              'Archive'
            ) : (
              'Activate'
            )}
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

export default TeacherList;

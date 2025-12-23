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
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Grid,
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
  Groups as GroupsIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Sort as SortIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  FamilyRestroom as FamilyIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  LocationOn as LocationIcon,
  Class as ClassIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  getCohortMemberList,
  updateCohortMemberStatusTeacherList,
  getCohortList,
  assignCohortToStudent,
  removeCohortFromStudent,
} from '../services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import AddStudentModal from '@/components/AddStudentModal';
import { userList } from '@/services/UserList';
import { deleteUser } from '@/services/UserService';

// Define types
interface Student {
  id: string;
  userId: string;
  cohortId: string;
  role: 'Student' | 'Learner';
  status: 'active' | 'inactive' | 'pending' | 'archived';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    profile?: {
      gender?: string;
      dob?: string;
      address?: string;
      grade?: string;
      parentName?: string;
      parentPhone?: string;
    };
  };
  customField?: Array<{
    fieldId: string;
    label: string;
    type: string;
    selectedValues: any[];
  }>;
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
}

// Define sortable columns
type SortableColumn =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'createdAt'
  | 'status';
type SortDirection = 'asc' | 'desc';

const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
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
  const [selectedClass, setSelectedClass] = useState('All');
  const [classes, setClasses] = useState<CohortCenter[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    email: true,
    phone: true,
    status: true,
    createdAt: true,
    actions: true,
  });

  // Assign Class Dialog State
  const [assignClassDialogOpen, setAssignClassDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>(
    []
  );
  const [assignLoading, setAssignLoading] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(
    new Set()
  );

  // Archive/Delete Dialog State
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [studentToUpdate, setStudentToUpdate] = useState<Student | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

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

  // Fetch classes from API
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

  // Fetch students from API
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const requestData: any = {
        limit: pagination.limit,
        offset: pagination.page * pagination.limit,
        sort: [sortBy, sortDirection],
        filters: {
          role: 'Student',
          ...(statusFilter !== 'all' && { status: [statusFilter] }),
          cohortId: selectedClass !== 'All' ? selectedClass : undefined,
        },
      };

      const response = await userList(requestData);
      if (response && Array.isArray(response.getUserDetails)) {
        // Transform API response to match Student interface
        const studentsData = response.getUserDetails.map((student: any) => ({
          id: student.userId,
          userId: student.userId,
          cohortId: student.cohortId || '',
          role: student.role,
          status: student.status,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
          user: {
            id: student.userId,
            username: student.username,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email || '',
            phone: student.mobile || '',
            status: student.status,
          },
          customField: student.customField || [],
        }));

        setStudents(studentsData);
        setPagination((prev) => ({
          ...prev,
          total: parseInt(response.totalCount) || studentsData.length,
        }));
      } else {
        setStudents([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      const errorMessage =
        err.message || 'Failed to fetch students from server';
      setError(errorMessage);
      showToastMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, selectedClass]);

  // Initial fetch
  useEffect(() => {
    fetchClusters();
    fetchSchools();
    fetchClasses();
  }, [fetchClusters, fetchSchools, fetchClasses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch all classes for assignment dialog
  const fetchAllClassesForAssignment = useCallback(async () => {
    try {
      const classRequestData = {
        limit: 0,
        offset: 0,
        filters: {
          type: 'COHORT',
          status: ['active'],
        },
      };

      const response: any = await getCohortList(classRequestData as any);
      return response?.results?.cohortDetails || [];
    } catch (err) {
      console.error('Error fetching all classes:', err);
      return [];
    }
  }, []);

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

  // Handle cluster filter
  const handleClusterChange = (event: SelectChangeEvent) => {
    const newCluster = event.target.value;
    setSelectedCluster(newCluster);
    if (newCluster !== selectedCluster) {
      setSelectedSchool('All');
      setSelectedClass('All');
    }
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
    if (newSchool !== selectedSchool) {
      setSelectedClass('All');
    }
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

  // Handle add/edit student
  const handleAddStudent = () => {
    setEditingStudent(null);
    setOpenForm(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setOpenForm(true);
  };

  // Handle archive/unarchive student
  const handleArchiveStudent = (student: Student) => {
    setStudentToUpdate(student);
    setArchiveDialogOpen(true);
  };

  // Confirm archive/unarchive
  const handleConfirmArchive = async () => {
    if (!studentToUpdate) return;

    setArchiveLoading(true);
    try {
      const newStatus =
        studentToUpdate.status === 'active' ? 'archived' : 'active';

      // Update student status using API
      await deleteUser(studentToUpdate.userId, {
        userData: {
          status: newStatus,
          type: 'Student',
        },
      });

      // Refresh student list
      await fetchStudents();

      const action = newStatus === 'archived' ? 'archived' : 'activated';
      showToastMessage(`Student ${action} successfully`, 'success');
      setSnackbar({
        open: true,
        message: `Student ${action} successfully`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Error updating student status:', err);
      const errorMessage = err.message || 'Failed to update student status';
      showToastMessage(errorMessage, 'error');
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setArchiveLoading(false);
      setArchiveDialogOpen(false);
      setStudentToUpdate(null);
    }
  };

  const handleCancelArchive = () => {
    setArchiveDialogOpen(false);
    setStudentToUpdate(null);
  };

  // Handle assign class click
  const handleAssignClassClick = async (student: Student) => {
    setSelectedStudent(student);
    setAssignLoading(true);
    setAssignClassDialogOpen(true);

    try {
      // Fetch all classes
      const allClasses = await fetchAllClassesForAssignment();
      console.log('All classes fetched:', allClasses);

      // Get student's current classes - fetch from API if available
      const studentCurrentClasses = student.cohortId ? [student.cohortId] : [];

      // Fetch schools for grouping
      const allSchools = await getCohortList({
        limit: 0,
        offset: 0,
        filters: { type: 'SCHOOL', status: ['active'] },
      });

      const schoolsData =
        allSchools?.results?.cohortDetails || allSchools || [];
      console.log('Schools fetched:', schoolsData);

      // Create a map for quick school name lookup
      const schoolMap = new Map();
      schoolsData.forEach((school: any) => {
        if (school.cohortId) {
          schoolMap.set(school.cohortId, school.name);
        }
      });

      // Transform classes to ClassAssignment format
      const assignments: ClassAssignment[] = allClasses.map((cls: any) => {
        const schoolName = schoolMap.get(cls.parentId) || 'No Name School';
        return {
          classId: cls.cohortId,
          className: cls.name,
          schoolId: cls.parentId || '',
          schoolName: schoolName,
          clusterId: '', // You might need to fetch cluster info
          clusterName: '',
          assigned: studentCurrentClasses.includes(cls.cohortId),
        };
      });

      console.log('Assignments created:', assignments);
      setClassAssignments(assignments);

      // Auto-expand schools that have assigned classes
      const schoolsWithAssignments = new Set<string>();
      assignments.forEach((cls) => {
        if (cls.assigned && cls.schoolId) {
          schoolsWithAssignments.add(cls.schoolId);
        }
      });
      setExpandedSchools(schoolsWithAssignments);
    } catch (err) {
      console.error('Error loading classes for assignment:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load classes. Please try again.',
        severity: 'error',
      });

      // Set empty assignments if there's an error
      setClassAssignments([]);
    } finally {
      setAssignLoading(false);
    }
  };
  // Handle assign class dialog close
  const handleAssignClassDialogClose = () => {
    setAssignClassDialogOpen(false);
    setSelectedStudent(null);
    setClassAssignments([]);
    setExpandedSchools(new Set());
  };

  // Handle class checkbox change
  const handleClassCheckboxChange = (classId: string) => {
    setClassAssignments((prev) =>
      prev.map((cls) =>
        cls.classId === classId ? { ...cls, assigned: !cls.assigned } : cls
      )
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

  // Handle save assignments
  const handleSaveAssignments = async () => {
    if (!selectedStudent || !hasSelectedClasses) return;

    setAssignLoading(true);
    try {
      // Get classes to assign and remove
      const classesToAssign = classAssignments
        .filter((cls) => cls.assigned)
        .map((cls) => cls.classId);

      const classesToRemove = classAssignments
        .filter((cls) => !cls.assigned)
        .map((cls) => cls.classId);

      // Assign new classes
      if (classesToAssign.length > 0) {
        const assignResponse = await assignCohortToStudent({
          cohortId: classesToAssign,
          userId: selectedStudent.userId,
        });

        if (!assignResponse?.success) {
          throw new Error(
            assignResponse?.message || 'Failed to assign classes'
          );
        }
      }

      // Remove classes
      if (classesToRemove.length > 0) {
        for (const classId of classesToRemove) {
          const removeResponse = await removeCohortFromStudent({
            cohortId: classId,
            userId: selectedStudent.userId,
          });

          if (!removeResponse?.success) {
            throw new Error(
              removeResponse?.message || 'Failed to remove classes'
            );
          }
        }
      }

      setSnackbar({
        open: true,
        message: 'Class assignments updated successfully',
        severity: 'success',
      });

      handleAssignClassDialogClose();
      fetchStudents(); // Refresh the student list
    } catch (err: any) {
      console.error('Error updating class assignments:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to update class assignments',
        severity: 'error',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (studentId: string, newStatus: string) => {
    setLoading(true);
    try {
      await updateCohortMemberStatusTeacherList(studentId, newStatus);
      await fetchStudents();
      showToastMessage(`Student status updated to ${newStatus}`, 'success');
    } catch (err) {
      console.error('Error updating student status:', err);
      showToastMessage('Failed to update student status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchStudents();
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

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.user.firstName.toLowerCase().includes(term) ||
          student.user.lastName.toLowerCase().includes(term) ||
          student.user.email.toLowerCase().includes(term) ||
          student.user.phone.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [students, searchTerm]);
const [summaryCounts, setSummaryCounts] = useState({
  total: 0,
  active: 0,
  archived: 0,
});

  // Calculate stats
const { total, active, archived } = summaryCounts;
  const inactiveCount = students.filter((s) => s.status === 'inactive').length;
  const pendingCount = students.filter((s) => s.status === 'pending').length;
  const archivedCount = students.filter((s) => s.status === 'archived').length;

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

  // Get status icon
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

  useEffect(() => {
  const fetchStudentSummaryCounts = async () => {
    try {
      const baseParams = {
        limit: 1,
        offset: 0,
        sort: ['createdAt', 'asc'] as any,
      };

      const totalResp = await userList({
        ...baseParams,
        filters: { role: 'Student' },
      });

      const activeResp = await userList({
        ...baseParams,
        filters: { role: 'Student', status: 'active' },
      });

      const archivedResp = await userList({
        ...baseParams,
        filters: { role: 'Student', status: 'archived' },
      });

      setSummaryCounts({
        total: totalResp?.totalCount || 0,
        active: activeResp?.totalCount || 0,
        archived: archivedResp?.totalCount || 0,
      });
    } catch (e) {
      console.error('Error fetching student summary counts', e);
    }
  };

  fetchStudentSummaryCounts();
}, []);

  // Get status text
  const getStatusText = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Get display value for any field
  const getDisplayValue = (value: any) => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }
    return value;
  };

  // Get student initials for avatar
  const getInitials = (student: Student) => {
    const firstName = student.user.firstName || '';
    const lastName = student.user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'S';
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Group classes by school for the assign class dialog
  const groupedClasses = useMemo(() => {
    const groups: Record<string, ClassAssignment[]> = {};
    classAssignments.forEach((cls) => {
      const schoolId = cls.schoolId || 'unknown';
      if (!groups[schoolId]) {
        groups[schoolId] = [];
      }
      groups[schoolId].push(cls);
    });
    return groups;
  }, [classAssignments]);

  // Get archive button props
  const getArchiveButtonProps = (student: Student) => {
    if (student.status === 'active') {
      return {
        color: 'error' as const,
        tooltip: 'Archive Student',
      };
    } else if (student.status === 'archived') {
      return {
        color: 'default' as const,
        tooltip: 'Activate Student',
      };
    } else {
      return {
        color: 'warning' as const,
        tooltip: 'Update Status',
      };
    }
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
              Students
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage all students and their enrollments
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
              onClick={handleAddStudent}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
            >
              Add New Student
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
            <PersonIcon sx={{ fontSize: 40, color: '#1976d2' }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {pagination.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Students
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
                {active}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Students
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
                Inactive Students
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
            {/* Active/Inactive Toggle */}
            {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusChange}
                size="small"
              >
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
                  <Typography variant="body2">Inactive</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box> */}

            {/* Cluster Dropdown */}
            {/* <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Cluster</InputLabel>
              <Select
                value={selectedCluster}
                label="Select Cluster"
                onChange={handleClusterChange}
              >
                <MenuItem value="All">-</MenuItem>
                {clusters.map((cluster) => (
                  <MenuItem key={cluster.cohortId} value={cluster.cohortId}>
                    {cluster.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl> */}

            {/* School Dropdown */}
            {/* <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select School</InputLabel>
              <Select
                value={selectedSchool}
                label="Select School"
                onChange={handleSchoolChange}
              >
                <MenuItem value="All">-</MenuItem>
                {schools.map((school) => (
                  <MenuItem key={school.cohortId} value={school.cohortId}>
                    {school.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl> */}

            {/* Class Dropdown */}
            {/* <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Class</InputLabel>
              <Select
                value={selectedClass}
                label="Select Class"
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

            {/* Search Bar */}
            <Box sx={{ flexGrow: 1, maxWidth: 300 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search students by name, phone..."
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
          </Box>
        </Paper>

        {/* Students Table */}
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
          ) : filteredStudents.length === 0 ? (
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
                No Students Found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchTerm || selectedClass !== 'All' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No students available. Try adding a new student.'}
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
                            active={sortBy === 'firstName'}
                            direction={
                              sortBy === 'firstName' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('firstName')}
                          >
                            Student Name
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {columnVisibility.email && (
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'email'}
                            direction={
                              sortBy === 'email' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('email')}
                          >
                            Email
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {columnVisibility.phone && <TableCell>Phone</TableCell>}
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
                    {filteredStudents.map((student) => {
                      const archiveProps = getArchiveButtonProps(student);
                      return (
                        <TableRow key={student.id} hover>
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
                                    bgcolor: '#1976d2',
                                  }}
                                >
                                  {getInitials(student)}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight="medium"
                                  >
                                    {student.user.firstName}{' '}
                                    {student.user.lastName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    ID: {student.userId.substring(0, 8)}...
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                          )}
                          {columnVisibility.email && (
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {getDisplayValue(student.user.email)}
                                </Typography>
                              </Box>
                            </TableCell>
                          )}
                          {columnVisibility.phone && (
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <PhoneIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {getDisplayValue(student.user.phone)}
                                </Typography>
                              </Box>
                            </TableCell>
                          )}
                          {columnVisibility.status && (
                            <TableCell>
                              <Chip
                                label={getStatusText(student.status)}
                                size="small"
                                color={getStatusColor(student.status) as any}
                                icon={
                                  getStatusIcon(student.status) || undefined
                                }
                                variant="outlined"
                              />
                            </TableCell>
                          )}
                        
                          {columnVisibility.actions && (
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="Assign Class">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleAssignClassClick(student)
                                    }
                                    color="primary"
                                  >
                                    <AssignmentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={archiveProps.tooltip}>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleArchiveStudent(student)
                                    }
                                    color={archiveProps.color}
                                    sx={{
                                      ...(student.status === 'active' && {
                                        '&:hover': {
                                          backgroundColor: '#ffebee',
                                        },
                                      }),
                                      ...(student.status === 'archived' && {
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

      {/* Student Form Dialog */}
      <AddStudentModal
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
            Assign Classes to {selectedStudent?.user.firstName}{' '}
            {selectedStudent?.user.lastName}
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
                Select or deselect classes for this student
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Bulk actions */}
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
                      {assignLoading
                        ? 'Loading...'
                        : 'Make sure classes are created and active'}
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {Object.entries(groupedClasses).map(
                      ([schoolId, schoolClasses]) => {
                        const schoolName =
                          schoolClasses[0]?.schoolName || 'No Name School';
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
                                          onChange={() =>
                                            handleClassCheckboxChange(
                                              cls.classId
                                            )
                                          }
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
            disabled={assignLoading || !hasSelectedClasses}
            startIcon={assignLoading ? <CircularProgress size={20} /> : null}
          >
            {assignLoading ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive/Unarchive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={handleCancelArchive}
        maxWidth="md"
        fullWidth
        PaperProps={{
          style: {
            maxWidth: '400px',
          },
        }}
      >
        <DialogTitle>
          {studentToUpdate?.status === 'active'
            ? 'Archive Student'
            : 'Activate Student'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor:
                  studentToUpdate?.status === 'archived'
                    ? '#757575'
                    : '#f44336',
                width: 40,
                height: 40,
              }}
            >
              {studentToUpdate && getInitials(studentToUpdate)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {studentToUpdate?.user.firstName}{' '}
                {studentToUpdate?.user.lastName}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {studentToUpdate?.user.email}
              </Typography>
              <Chip
                label={getStatusText(studentToUpdate?.status || '')}
                size="small"
                color={getStatusColor(studentToUpdate?.status || '') as any}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          <Typography>
            {studentToUpdate?.status === 'active'
              ? `Are you sure you want to archive this student?`
              : `Are you sure you want to activate this student?`}
          </Typography>
          {/* {studentToUpdate?.status === 'active' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Archived students will be marked as inactive and won't be able to
              access the system.
            </Alert>
          )}
          {studentToUpdate?.status === 'archived' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Activating this student will make them active and able to access
              the system again.
            </Alert>
          )} */}
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
              ...(studentToUpdate?.status === 'active' && {
                backgroundColor: '#d32f2f',
                '&:hover': { backgroundColor: '#c62828' },
              }),
              ...(studentToUpdate?.status === 'archived' && {
                backgroundColor: '#1976d2',
                '&:hover': { backgroundColor: '#1565c0' },
              }),
            }}
          >
            {archiveLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : studentToUpdate?.status === 'active' ? (
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

export default StudentList;

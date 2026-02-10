/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @nx/enforce-module-boundaries */
// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
import { userList } from '@/services/UserList';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  ListItemText,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { Numbers } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddUserForm from '@/components/AddUserForm';
import EditUserModal from '@/components/EditUserModal';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@/services/UserService';
import { Archive } from 'lucide-react';
import Image from 'next/image';
import {
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import {
  getCohortList,
  bulkCreateCohortMembers,
} from '@/services/CohortService/cohortService';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { get } from '@/services/RestClient';
import { showToastMessage } from '@/components/Toastify';

const Staff = () => {
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);
  const [roleId, setRoleID] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    archived: 0,
  });
  const [departmentSortDirection, setDepartmentSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Assign Schools Dialog State
  const [assignSchoolDialogOpen, setAssignSchoolDialogOpen] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState<any | null>(null);
  const [schoolAssignments, setSchoolAssignments] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');

  // Edit Staff Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<any | null>(null);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (response?.result?.totalCount !== 0) {
      searchData({}, 0);
    }
  }, [pageLimit]);
  
  useEffect(() => {
    setRoleID(localStorage.getItem('roleId'));
    setTenantId(localStorage.getItem('tenantId'));
    // Initial load
    searchData({}, 0);
  }, []);

  // Fetch overall counts for staff (all pages, by status)
  const fetchSummaryCounts = useCallback(async () => {
    try {
      const tenantIdLocal = localStorage.getItem('tenantId');
      if (!tenantIdLocal) return;

      const baseParams = {
        limit: 1,
        offset: 0,
        sort: ['createdAt', 'asc'] as any,
      };

      // Total staff for this tenant & role
      const totalResp = await userList({
        ...baseParams,
        filters: { role: 'Staff', tenantId: tenantIdLocal },
      });

      // Active staff
      const activeResp = await userList({
        ...baseParams,
        filters: { role: 'Staff', tenantId: tenantIdLocal, status: 'active' },
      });

      // Archived staff
      const archivedResp = await userList({
        ...baseParams,
        filters: { role: 'Staff', tenantId: tenantIdLocal, status: 'archived' },
      });

      setSummaryCounts({
        total: totalResp?.totalCount || 0,
        active: activeResp?.totalCount || 0,
        archived: archivedResp?.totalCount || 0,
      });
    } catch (e) {
      console.error('Error fetching staff summary counts:', e);
    }
  }, []);

  useEffect(() => {
    fetchSummaryCounts();
  }, [fetchSummaryCounts]);

  // Handle search input change - trigger search with debounce
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        if (value.trim()) {
          const searchFormData = { firstName: value };
          searchData(searchFormData, 0);
        } else {
          searchData({}, 0);
        }
      }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const searchData = async (formData, newPage) => {
    // Get tenant ID from localStorage to filter users by tenant
    const tenantId = localStorage.getItem('tenantId');
    const staticFilter = {
      role: 'Staff',
      tenantId: tenantId,
    };
    const { sortBy, firstName } = formData;
    const staticSort = ['firstName', sortBy || 'asc'];

    // Sequential search: First by firstName, then by username if no results
    if (firstName) {
      // First, try searching by firstName
      const searchFormDataFirstName = { ...formData };
      searchFormDataFirstName.firstName = firstName;
      // Remove username to search only by firstName
      delete searchFormDataFirstName.username;

      console.log('Staff: Searching by firstName:', firstName);

      // Make first API call with firstName
      const { sortBy: _, ...restFormData } = searchFormDataFirstName;
      const filtersFirstName = {
        ...staticFilter,
        ...Object.entries(restFormData).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            if (key === 'status') {
              acc[key] = [value];
            } else {
              acc[key] = value;
            }
          }
          return acc;
        }, {} as Record<string, any>),
      };

      const dataFirstName = {
        limit: pageLimit,
        offset: newPage * pageLimit,
        sort: staticSort,
        filters: filtersFirstName,
      };

      const respFirstName = await userList(dataFirstName);
      const totalCountFirstName = respFirstName?.totalCount || 0;
      const userDetailsFirstName = respFirstName?.getUserDetails || [];

      console.log('Staff: firstName search results:', {
        totalCount: totalCountFirstName,
        usersFound: userDetailsFirstName.length,
      });

      // If results found with firstName, use those results
      if (totalCountFirstName > 0 && userDetailsFirstName.length > 0) {
        setPageOffset(newPage * pageLimit);
        setCurrentPage(newPage);
        setResponse({ result: respFirstName });
        return;
      }

      // If no results with firstName, try searching by username
      console.log('Staff: No results with firstName, searching by username:', firstName);
      const searchFormDataUsername = { ...formData };
      searchFormDataUsername.username = firstName;
      // Remove firstName to search only by username
      delete searchFormDataUsername.firstName;

      const { sortBy: __, ...restFormDataUsername } = searchFormDataUsername;
      const filtersUsername = {
        ...staticFilter,
        ...Object.entries(restFormDataUsername).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            if (key === 'status') {
              acc[key] = [value];
            } else {
              acc[key] = value;
            }
          }
          return acc;
        }, {} as Record<string, any>),
      };

      const dataUsername = {
        limit: pageLimit,
        offset: newPage * pageLimit,
        sort: staticSort,
        filters: filtersUsername,
      };

      const respUsername = await userList(dataUsername);
      console.log('Staff: username search results:', {
        totalCount: respUsername?.totalCount || 0,
        usersFound: (respUsername?.getUserDetails || []).length,
      });

      setPageOffset(newPage * pageLimit);
      setCurrentPage(newPage);
      setResponse({ result: respUsername });
    } else {
      // No search term, use normal search
      await searchListData(
        formData,
        newPage,
        staticFilter,
        pageLimit,
        setPageOffset,
        setCurrentPage,
        setResponse,
        userList,
        staticSort
      );
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    const searchFormData = searchTerm ? { firstName: searchTerm } : {};
    searchData(searchFormData, currentPage);
  };

  // Handle page change
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value - 1);
    const searchFormData = searchTerm ? { firstName: searchTerm } : {};
    searchData(searchFormData, value - 1);
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: SelectChangeEvent) => {
    setPageLimit(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const handleOpenModal = () => setOpenModal(true);

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleEditStaff = (staffMember: any) => {
    setStaffToEdit(staffMember);
    setEditModalOpen(true);
  };


  // Get department from custom fields
  const getDepartment = (staffMember: any) => {
    const departmentFieldId = '0d501559-3bb2-44ed-8e33-850f6ed22666';
    // Check both customFields (plural) and customField (singular)
    const customFields = staffMember.customFields || staffMember.customField || [];
    if (!Array.isArray(customFields) || customFields.length === 0) {
      return 'N/A';
    }
    const departmentField = customFields.find(
      (field: any) => 
        field.fieldId === departmentFieldId || 
        field.fieldid === departmentFieldId ||
        field.field_id === departmentFieldId
    );
    if (departmentField) {
      // Handle selectedValues (array) or value (string/array)
      if (departmentField.selectedValues && Array.isArray(departmentField.selectedValues)) {
        return departmentField.selectedValues[0] || 'N/A';
      }
      if (departmentField.value) {
        if (Array.isArray(departmentField.value)) {
          return departmentField.value[0] || 'N/A';
        }
        return departmentField.value || 'N/A';
      }
    }
    return 'N/A';
  };

  // Calculate stats
  const staffRaw = response?.result?.getUserDetails || [];
  const totalCount = response?.result?.totalCount || 0;
  const { total: totalSummary, active: activeCount, archived: archivedCount } = summaryCounts;

  // Handle department sort
  const handleDepartmentSort = () => {
    if (departmentSortDirection === null) {
      setDepartmentSortDirection('asc');
    } else if (departmentSortDirection === 'asc') {
      setDepartmentSortDirection('desc');
    } else {
      setDepartmentSortDirection(null);
    }
  };

  // Sort staff by department if sort direction is set
  const staff = useMemo(() => {
    if (departmentSortDirection === null) {
      return staffRaw;
    }
    const sorted = [...staffRaw].sort((a, b) => {
      const deptA = getDepartment(a);
      const deptB = getDepartment(b);
      if (departmentSortDirection === 'asc') {
        return deptA.localeCompare(deptB);
      } else {
        return deptB.localeCompare(deptA);
      }
    });
    return sorted;
  }, [staffRaw, departmentSortDirection]);

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
  const getFullName = (staffMember: any) => {
    return `${staffMember.firstName || ''} ${staffMember.middleName || ''} ${staffMember.lastName || ''}`.trim();
  };

  // Get initials for avatar
  const getInitials = (staffMember: any) => {
    const first = staffMember.firstName?.charAt(0) || '';
    const last = staffMember.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  // Handle archive
  const handleArchive = async (staffMember: any) => {
    const userId = staffMember?.userId;
    const newStatus = staffMember.status === 'active' ? 'archived' : 'active';

    const response = await deleteUser(userId, {
      userData: {
        status: newStatus,
      },
    });

    if (response) {
      const searchFormData = searchTerm ? { firstName: searchTerm } : {};
      searchData(searchFormData, currentPage);
    }
  };

  // Interface for school assignments
  interface SchoolAssignment {
    schoolId: string;
    schoolName: string;
    assigned: boolean;
    originallyAssigned: boolean;
  }

  // Fetch all schools for assignment dialog
  const fetchAllSchoolsForAssignment = useCallback(
    async (staffId?: string) => {
      try {
        const schoolRequestData = {
          limit: 0,
          offset: 0,
          filters: {
            type: 'SCHOOL',
            status: ['active'],
          },
        };

        const response: any = await getCohortList(schoolRequestData as any);
        
        let allSchools: any[] = [];
        if (Array.isArray(response)) {
          allSchools = response;
        } else if (response?.results?.cohortDetails) {
          allSchools = response.results.cohortDetails;
        } else if (response?.cohortDetails) {
          allSchools = response.cohortDetails;
        } else if (response?.results && Array.isArray(response.results)) {
          allSchools = response.results;
        }

        // If we have a staffId, fetch their current school assignments using mycohorts API
        let staffCurrentSchools: string[] = [];
        if (staffId) {
          try {
            const apiUrl = `${API_ENDPOINTS.myCohorts(staffId)}?customField=true&children=true`;
            const staffResponse = await get(apiUrl);
            const cohorts = staffResponse?.data?.result || [];
            
            staffCurrentSchools = cohorts
              .filter((cohort: any) => cohort.type === 'SCHOOL')
              .map((cohort: any) => String(cohort.cohortId || '').trim())
              .filter((id: string) => id);
          } catch (err) {
            console.error('Error fetching staff current schools:', err);
          }
        }

        // Transform schools to SchoolAssignment format
        const assignments: SchoolAssignment[] = allSchools.map((school: any) => {
          const schoolId = String(school.cohortId || school.id || '').trim();
          const assignedSchoolsAsStrings = staffCurrentSchools.map(id => String(id).trim());
          const isAssigned = assignedSchoolsAsStrings.some(assignedId => assignedId === schoolId);
          
          return {
            schoolId: schoolId,
            schoolName: school.name || school.cohortName || 'Unknown School',
            assigned: isAssigned,
            originallyAssigned: isAssigned,
          };
        });

        return assignments;
      } catch (err) {
        console.error('Error fetching all schools for assignment:', err);
        return [];
      }
    },
    []
  );

  // Handle assign school button click
  const handleAssignSchoolClick = async (staffMember: any) => {
    setSelectedStaffMember(staffMember);
    setAssignSchoolDialogOpen(true);
    setAssignLoading(true);

    try {
      const assignments = await fetchAllSchoolsForAssignment(staffMember.userId);
      setSchoolAssignments(assignments);

      // Expand schools that have assignments
      const schoolsWithAssignments = new Set(
        assignments
          .filter((school) => school.assigned)
          .map((school) => school.schoolId)
      );
      setExpandedSchools(schoolsWithAssignments);
    } catch (err) {
      console.error('Error loading schools for assignment:', err);
      showToastMessage('Failed to load schools. Please try again.', 'error');
      setSchoolAssignments([]);
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle assign school dialog close
  const handleAssignSchoolDialogClose = () => {
    setAssignSchoolDialogOpen(false);
    setSelectedStaffMember(null);
    setSchoolAssignments([]);
    setExpandedSchools(new Set());
    setSchoolSearchTerm('');
  };

  // Filter schools based on search term
  const filteredSchoolAssignments = useMemo(() => {
    if (!schoolSearchTerm.trim()) {
      return schoolAssignments;
    }
    const searchLower = schoolSearchTerm.toLowerCase().trim();
    return schoolAssignments.filter((school) =>
      school.schoolName.toLowerCase().includes(searchLower)
    );
  }, [schoolAssignments, schoolSearchTerm]);

  // Handle school checkbox change
  const handleSchoolCheckboxChange = (schoolId: string) => {
    setSchoolAssignments((prev) =>
      prev.map((school) => {
        if (school.schoolId === schoolId) {
          return { ...school, assigned: !school.assigned };
        }
        return school;
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

  // Handle save school assignments
  const handleSaveSchoolAssignments = async () => {
    if (!selectedStaffMember) return;

    setAssignLoading(true);
    try {
      const schoolsToAssign = schoolAssignments
        .filter((school) => school.assigned)
        .map((school) => school.schoolId);

      let previouslyAssignedSchools: string[] = [];
      try {
        const apiUrl = `${API_ENDPOINTS.myCohorts(selectedStaffMember.userId)}?customField=true&children=true`;
        const currentResponse = await get(apiUrl);
        const currentCohorts = currentResponse?.data?.result || [];
        previouslyAssignedSchools = currentCohorts
          .filter((cohort: any) => cohort.type === 'SCHOOL' && cohort.cohortMemberStatus === 'active')
          .map((cohort: any) => cohort.cohortId || cohort.id);
      } catch (err) {
        console.error('Error fetching current assignments:', err);
      }

      const schoolsToRemove = previouslyAssignedSchools.filter(
        (schoolId) => !schoolsToAssign.includes(schoolId)
      );

      const payload: any = {
        userId: [selectedStaffMember.userId],
        cohortId: schoolsToAssign,
      };

      if (schoolsToRemove.length > 0) {
        payload.removeCohortId = schoolsToRemove;
      }

      const response = await bulkCreateCohortMembers(payload);
      const isSuccess = 
        response?.responseCode === 200 || 
        response?.responseCode === 201 ||
        response?.params?.status === 'successful' ||
        response?.success;

      if (isSuccess) {
        showToastMessage('School assignments updated successfully', 'success');
        handleAssignSchoolDialogClose();
        handleRefresh();
      } else {
        throw new Error(response?.message || 'Failed to update school assignments');
      }
    } catch (err: any) {
      console.error('Error updating school assignments:', err);
      showToastMessage(err.message || 'Failed to update school assignments', 'error');
    } finally {
      setAssignLoading(false);
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
          Staff
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage all staff and their information
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
              onClick={handleOpenModal}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
            >
              {t('COMMON.ADD_NEW')} Staff
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
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
                    {totalSummary}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Staff
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
                    {activeCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Staff
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
                    {archivedCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Archived Staff
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

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
            <Box sx={{ flexGrow: 1, maxWidth: 300 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search staff by name, username..."
                value={searchTerm}
                onChange={handleSearchChange}
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

        {/* Staff Table */}
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
          ) : staff.length === 0 ? (
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
                {t('STAFF.NO_STAFF_FOUND') || 'No Staff Found'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No staff available. Try adding a new staff member.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={departmentSortDirection !== null}
                          direction={departmentSortDirection || 'asc'}
                          onClick={handleDepartmentSort}
                        >
                          Department
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staff.map((staffMember: any) => (
                      <TableRow key={staffMember.userId} hover>
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
                                  staffMember.status === 'archived'
                                    ? '#757575'
                                    : '#1976d2',
                              }}
                            >
                              {getInitials(staffMember)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                              >
                                {getFullName(staffMember)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                ID: {staffMember.userId?.substring(0, 8)}...
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
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
                              {staffMember.username || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            {staffMember.mobile ? (
                              <>
                                <PhoneIcon
                                  fontSize="small"
                                  color="action"
                                />
                                <Typography variant="body2">
                                  {staffMember.mobile}
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
                        <TableCell>
                          <Typography variant="body2">
                            {getDepartment(staffMember)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                       <Chip
                                label={getStatusText(staffMember.status)}
                                size="small"
                                color={getStatusColor(staffMember.status) as any}
                                icon={
                                  getStatusIcon(staffMember.status) || undefined
                                }
                                variant="outlined"
                              />
                        </TableCell>
                        <TableCell>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {staffMember.status === 'archived' ? (
                                  <Tooltip title="Activate">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleArchive(staffMember)}
                                     color={getStatusColor(staffMember.status) as any}
                                      sx={{
                                        '&:hover': {
                                          backgroundColor: '#f5f5f5',
                                        },
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <>
                                    <Tooltip title="Assign Center">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleAssignSchoolClick(staffMember)
                                        }
                                        color="primary"
                                      >
                                        <SchoolIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit Staff">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditStaff(staffMember)}
                                        // color="primary"
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Archive">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleArchive(staffMember)}
                                        color="error"
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalCount > pageLimit && (
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
                      value={pageLimit.toString()}
                      onChange={handleRowsPerPageChange}
                      sx={{ minWidth: 80 }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </Select>
                    <Typography variant="body2" color="textSecondary">
                      {currentPage * pageLimit + 1}-
                      {Math.min(
                        (currentPage + 1) * pageLimit,
                        totalCount
                      )}{' '}
                      of {totalCount}
                    </Typography>
                  </Box>

                  <Pagination
                    count={Math.ceil(totalCount / pageLimit)}
                    page={currentPage + 1}
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

      <SimpleModal
        open={openModal}
        onClose={handleCloseModal}
        showFooter={false}
        modalTitle={t('STAFF.NEW_STAFF') || 'Add New Staff'}
      >
        <AddUserForm
          userType="staff"
          onSuccess={() => {
            setSearchTerm('');
            searchData({}, 0);
            fetchSummaryCounts(); // Refresh summary counts after user creation
            setOpenModal(false);
          }}
          onCancel={() => {
            setOpenModal(false);
          }}
        />
      </SimpleModal>

      {/* Edit Staff Modal */}
      <EditUserModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleRefresh}
        user={staffToEdit}
        userType="Staff"
      />

      {/* Assign Center Dialog */}
      <Dialog
        open={assignSchoolDialogOpen}
        onClose={handleAssignSchoolDialogClose}
        maxWidth="sm"
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
            Assign Center to {getFullName(selectedStaffMember || {})}
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
                p: 4
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
                Select or deselect centers for this staff member
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Search centers..."
                value={schoolSearchTerm}
                onChange={(e) => setSchoolSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minHeight: 200,
                }}
              >
                {filteredSchoolAssignments.length === 0 ? (
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
                      No centers found
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {filteredSchoolAssignments.map((school) => {
                      return (
                        <React.Fragment key={school.schoolId}>
                          <ListItem
                            disablePadding
                          >
                            <ListItemButton
                              onClick={() => handleSchoolCheckboxChange(school.schoolId)}
                              sx={{ py: 1 }}
                            >
                              <ListItemIcon sx={{ minWidth: 40 }}>
                                <Checkbox
                                  edge="start"
                                  checked={school.assigned}
                                  tabIndex={-1}
                                  disableRipple
                                />
                              </ListItemIcon>
                              <ListItemIcon sx={{ minWidth: 40 }}>
                                <SchoolIcon />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight="medium">
                                    {school.schoolName}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="textSecondary">
                                    ID: {school.schoolId.substring(0, 8)}...
                                  </Typography>
                                }
                              />
                              {school.originallyAssigned && (
                                <Chip 
                                  label="Assigned" 
                                  size="small" 
                                  variant="outlined" 
                                  color="success"
                                  sx={{ ml: 1 }} 
                                />
                              )}
                            </ListItemButton>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, flexShrink: 0 }}>
          <Button
            onClick={handleAssignSchoolDialogClose}
            disabled={assignLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveSchoolAssignments}
            variant="contained"
            disabled={assignLoading}
          >
            {assignLoading ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default Staff;


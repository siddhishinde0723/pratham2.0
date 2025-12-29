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
  getCohortMemberList,
  assignClassToTeacher,
  bulkCreateCohortMembers,
} from '@/services/CohortService/cohortService';
import { getCohortList as getMyCohorts } from '@/services/GetCohortList';
import { API_ENDPOINTS } from '@/utils/API/APIEndpoints';
import { get } from '@/services/RestClient';
import { showToastMessage } from '@/components/Toastify';

const Supervisor = () => {
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
  const [selectedSupervisor, setSelectedSupervisor] = useState<any | null>(null);
  const [schoolAssignments, setSchoolAssignments] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

  const { t, i18n } = useTranslation();

  // Debug: Log schoolAssignments state changes
  useEffect(() => {
    if (schoolAssignments.length > 0) {
      console.log('schoolAssignments state updated:', schoolAssignments);
      console.log('Assigned schools in state:', schoolAssignments.filter(s => s.assigned).map(s => ({ id: s.schoolId, name: s.schoolName })));
    }
  }, [schoolAssignments]);

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

  // Fetch overall counts for supervisors (all pages, by status)
  const fetchSummaryCounts = useCallback(async () => {
    try {
      const tenantIdLocal = localStorage.getItem('tenantId');
      if (!tenantIdLocal) return;

      const baseParams = {
        limit: 1,
        offset: 0,
        sort: ['createdAt', 'asc'] as any,
      };

      // Total supervisors for this tenant & role
      const totalResp = await userList({
        ...baseParams,
        filters: { role: 'Supervisor', tenantId: tenantIdLocal },
      });

      // Active supervisors
      const activeResp = await userList({
        ...baseParams,
        filters: { role: 'Supervisor', tenantId: tenantIdLocal, status: 'active' },
      });

      // Archived supervisors
      const archivedResp = await userList({
        ...baseParams,
        filters: { role: 'Supervisor', tenantId: tenantIdLocal, status: 'archived' },
      });

      setSummaryCounts({
        total: totalResp?.totalCount || 0,
        active: activeResp?.totalCount || 0,
        archived: archivedResp?.totalCount || 0,
      });
    } catch (e) {
      console.error('Error fetching supervisor summary counts:', e);
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
      role: 'Supervisor',
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

      console.log('Supervisors: Searching by firstName:', firstName);

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

      console.log('Supervisors: firstName search results:', {
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
      console.log('Supervisors: No results with firstName, searching by username:', firstName);
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
      console.log('Supervisors: username search results:', {
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


  // Get department from custom fields
  const getDepartment = (supervisor: any) => {
    const departmentFieldId = '0d501559-3bb2-44ed-8e33-850f6ed22666';
    // Check both customFields (plural) and customField (singular)
    const customFields = supervisor.customFields || supervisor.customField || [];
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
  const supervisorsRaw = response?.result?.getUserDetails || [];
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

  // Sort supervisors by department if sort direction is set
  const supervisors = useMemo(() => {
    if (departmentSortDirection === null) {
      return supervisorsRaw;
    }
    const sorted = [...supervisorsRaw].sort((a, b) => {
      const deptA = getDepartment(a);
      const deptB = getDepartment(b);
      if (departmentSortDirection === 'asc') {
        return deptA.localeCompare(deptB);
      } else {
        return deptB.localeCompare(deptA);
      }
    });
    return sorted;
  }, [supervisorsRaw, departmentSortDirection]);

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
  const getFullName = (supervisor: any) => {
    return `${supervisor.firstName || ''} ${supervisor.middleName || ''} ${supervisor.lastName || ''}`.trim();
  };

  // Get initials for avatar
  const getInitials = (supervisor: any) => {
    const first = supervisor.firstName?.charAt(0) || '';
    const last = supervisor.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  // Handle archive
  const handleArchive = async (supervisor: any) => {
    const userId = supervisor?.userId;
    const newStatus = supervisor.status === 'active' ? 'archived' : 'active';

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
  }

  // Fetch all schools for assignment dialog
  const fetchAllSchoolsForAssignment = useCallback(
    async (supervisorId?: string) => {
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
        console.log('getCohortList response:', response);
        console.log('getCohortList response type:', typeof response);
        console.log('getCohortList response isArray:', Array.isArray(response));
        console.log('getCohortList response keys:', response ? Object.keys(response) : 'null');
        
        // Handle different possible response structures
        // getCohortList returns response?.data?.result which could be:
        // - { results: { cohortDetails: [...] } }
        // - { cohortDetails: [...] }
        // - [...] (direct array)
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

        console.log('All schools fetched for assignment:', allSchools.length);
        console.log('First school sample:', allSchools[0]);

        // If we have a supervisorId, fetch their current school assignments using mycohorts API
        let supervisorCurrentSchools: string[] = [];
        if (supervisorId) {
          try {
            // Call the mycohorts API with customField and children parameters
            // Note: academicyearid header is automatically added by the interceptor
            const apiUrl = `${API_ENDPOINTS.myCohorts(supervisorId)}?customField=true&children=true`;
            const supervisorResponse = await get(apiUrl);
            
            console.log('Full supervisor response:', supervisorResponse);
            console.log('Supervisor response data:', supervisorResponse?.data);
            
            // The API returns result as an array directly
            const cohorts = supervisorResponse?.data?.result || [];
            console.log('Supervisor cohorts from mycohorts API:', cohorts);
            console.log('Number of cohorts:', cohorts.length);
            
            // Filter for schools (type: 'SCHOOL') - include all schools regardless of status
            // Based on the API response structure: { cohortId, cohortName, type, cohortMemberStatus, ... }
            supervisorCurrentSchools = cohorts
              .filter((cohort: any) => {
                const isSchool = cohort.type === 'SCHOOL';
                // Include all schools, not just active ones (user can see all assigned schools)
                console.log('Cohort check:', {
                  cohortId: cohort.cohortId,
                  cohortName: cohort.cohortName,
                  type: cohort.type,
                  cohortMemberStatus: cohort.cohortMemberStatus,
                  isSchool
                });
                return isSchool;
              })
              .map((cohort: any) => {
                // Extract cohortId and convert to string - ensure it's trimmed
                const id = String(cohort.cohortId || '').trim();
                console.log('Extracted cohortId:', id, 'Length:', id.length);
                return id;
              })
              .filter((id: string) => id && id !== 'undefined' && id !== 'null' && id !== ''); // Remove any invalid values
            
            console.log('Supervisor current schools (IDs):', supervisorCurrentSchools);
            console.log('Number of assigned schools:', supervisorCurrentSchools.length);
          } catch (err) {
            console.error('Error fetching supervisor current schools:', err);
          }
        }

        // Transform schools to SchoolAssignment format
        const assignments: SchoolAssignment[] = allSchools.map((school: any) => {
          // Ensure schoolId is a string for comparison - try multiple possible fields and trim
          const schoolId = String(school.cohortId || school.id || '').trim();
          
          // Convert all assigned school IDs to strings and trim for comparison
          const assignedSchoolsAsStrings = supervisorCurrentSchools.map(id => String(id).trim());
          
          // Use some() for more reliable comparison
          const isAssigned = assignedSchoolsAsStrings.some(assignedId => {
            const match = assignedId === schoolId;
            if (match) {
              console.log('✅ MATCH FOUND:', {
                assignedId,
                schoolId,
                schoolName: school.name || school.cohortName,
                match
              });
            }
            return match;
          });
          
          // Debug log for first few schools and any matches
          if (allSchools.indexOf(school) < 5 || isAssigned) {
            console.log('School mapping:', {
              schoolId,
              schoolIdLength: schoolId.length,
              schoolName: school.name || school.cohortName,
              isAssigned,
              assignedSchoolsCount: supervisorCurrentSchools.length,
              assignedSchoolsList: supervisorCurrentSchools,
              assignedSchoolsAsStrings,
              comparison: {
                schoolIdType: typeof schoolId,
                schoolIdValue: schoolId,
                inList: assignedSchoolsAsStrings.includes(schoolId),
                exactMatch: assignedSchoolsAsStrings.some(id => id === schoolId),
                firstAssignedId: assignedSchoolsAsStrings[0],
                firstAssignedIdLength: assignedSchoolsAsStrings[0]?.length
              },
              schoolObjectKeys: Object.keys(school)
            });
          }
          
          return {
            schoolId: schoolId,
            schoolName: school.name || school.cohortName || 'Unknown School',
            assigned: isAssigned,
          };
        });

        console.log('School assignments created:', assignments.length);
        console.log('Assigned schools count:', assignments.filter(a => a.assigned).length);
        console.log('Full assignments:', assignments);
        return assignments;
      } catch (err) {
        console.error('Error fetching all schools for assignment:', err);
        return [];
      }
    },
    []
  );

  // Handle assign school button click
  const handleAssignSchoolClick = async (supervisor: any) => {
    setSelectedSupervisor(supervisor);
    setAssignSchoolDialogOpen(true);
    setAssignLoading(true);

    try {
      const assignments = await fetchAllSchoolsForAssignment(supervisor.userId);
      console.log('Assignments received in handleAssignSchoolClick:', assignments);
      console.log('Assigned schools count:', assignments.filter(a => a.assigned).length);
      console.log('Assigned schools:', assignments.filter(a => a.assigned).map(a => ({ id: a.schoolId, name: a.schoolName })));
      
      setSchoolAssignments(assignments);

      // Expand schools that have assignments
      const schoolsWithAssignments = new Set(
        assignments
          .filter((school) => school.assigned)
          .map((school) => school.schoolId)
      );
      setExpandedSchools(schoolsWithAssignments);
      
      // Log state after setting - use assignments variable instead of state
      console.log('State set with assignments:', assignments);
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
    setSelectedSupervisor(null);
    setSchoolAssignments([]);
    setExpandedSchools(new Set());
  };

  // Handle school checkbox change
  const handleSchoolCheckboxChange = (schoolId: string) => {
    setSchoolAssignments((prev) =>
      prev.map((school) =>
        school.schoolId === schoolId ? { ...school, assigned: !school.assigned } : school
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

  // Check if there are any changes (doesn't matter if adding or removing)
  const hasChanges = useMemo(() => {
    // Always allow save even if nothing is selected (to allow removing all assignments)
    return true;
  }, [schoolAssignments]);

  // Handle save school assignments
  const handleSaveSchoolAssignments = async () => {
    if (!selectedSupervisor) return;

    setAssignLoading(true);
    try {
      // Get schools that are currently selected (assigned = true)
      const schoolsToAssign = schoolAssignments
        .filter((school) => school.assigned)
        .map((school) => school.schoolId);

      // Get schools that were previously assigned but are now unchecked
      // We need to fetch current assignments first to determine what to remove
      let previouslyAssignedSchools: string[] = [];
      try {
        // Note: academicyearid header is automatically added by the interceptor
        const apiUrl = `${API_ENDPOINTS.myCohorts(selectedSupervisor.userId)}?customField=true&children=true`;
        const currentResponse = await get(apiUrl);
        const currentCohorts = currentResponse?.data?.result || [];
        previouslyAssignedSchools = currentCohorts
          .filter((cohort: any) => cohort.type === 'SCHOOL' && cohort.cohortMemberStatus === 'active')
          .map((cohort: any) => cohort.cohortId || cohort.id);
      } catch (err) {
        console.error('Error fetching current assignments:', err);
      }

      // Schools to remove are those that were previously assigned but are now unchecked
      const schoolsToRemove = previouslyAssignedSchools.filter(
        (schoolId) => !schoolsToAssign.includes(schoolId)
      );

      console.log('Schools to assign:', schoolsToAssign);
      console.log('Schools to remove:', schoolsToRemove);
      console.log('Supervisor userId:', selectedSupervisor.userId);

      // Prepare payload for bulkCreateCohortMembers API
      const payload: any = {
        userId: [selectedSupervisor.userId],
        cohortId: schoolsToAssign,
      };

      // Add removeCohortId if there are schools to remove
      if (schoolsToRemove.length > 0) {
        payload.removeCohortId = schoolsToRemove;
      }

      // Call the API to assign/remove schools
      const response = await bulkCreateCohortMembers(payload);

      console.log('API Response:', response);
      console.log('Response Code:', response?.responseCode);
      console.log('Params Status:', response?.params?.status);

      // Check for success - API returns 201 or 200, and params.status can be "successful"
      const isSuccess = 
        response?.responseCode === 200 || 
        response?.responseCode === 201 ||
        response?.params?.status === 'successful' ||
        response?.success;

      console.log('Is Success:', isSuccess);

      if (isSuccess) {
        const assignMsg = schoolsToAssign.length > 0 ? `${schoolsToAssign.length} school(s) assigned` : '';
        const removeMsg = schoolsToRemove.length > 0 ? `${schoolsToRemove.length} school(s) removed` : '';
        const message = [assignMsg, removeMsg].filter(Boolean).join(', ') + ' successfully';
        showToastMessage(message || 'Schools updated successfully', 'success');
        handleAssignSchoolDialogClose();
        searchData(searchTerm ? { firstName: searchTerm } : {}, currentPage);
      } else {
        const errorMsg = 
          response?.params?.errmsg || 
          response?.params?.err ||
          response?.message || 
          'Failed to update school assignments';
        console.error('Assignment failed:', errorMsg, response);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Error updating school assignments:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to update school assignments. Please try again.';
      showToastMessage(errorMessage, 'error');
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
          Supervisors
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage all supervisors and their information
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
              {t('COMMON.ADD_NEW')} Supervisor
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
                    Total Supervisors
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
                    Active Supervisors
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
                    Archived Supervisors
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
                placeholder="Search supervisors by name, username..."
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

        {/* Supervisors Table */}
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
          ) : supervisors.length === 0 ? (
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
                {t('SUPERVISORS.NO_SUPERVISORS_FOUND') || 'No Supervisors Found'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No supervisors available. Try adding a new supervisor.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Supervisor Name</TableCell>
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
                    {supervisors.map((supervisor: any) => (
                      <TableRow key={supervisor.userId} hover>
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
                                  supervisor.status === 'archived'
                                    ? '#757575'
                                    : '#1976d2',
                              }}
                            >
                              {getInitials(supervisor)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                              >
                                {getFullName(supervisor)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                ID: {supervisor.userId?.substring(0, 8)}...
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
                              {supervisor.username || 'N/A'}
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
                            {supervisor.mobile ? (
                              <>
                                <PhoneIcon
                                  fontSize="small"
                                  color="action"
                                />
                                <Typography variant="body2">
                                  {supervisor.mobile}
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
                            {getDepartment(supervisor)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                       <Chip
                                label={getStatusText(supervisor.status)}
                                size="small"
                                color={getStatusColor(supervisor.status) as any}
                                icon={
                                  getStatusIcon(supervisor.status) || undefined
                                }
                                variant="outlined"
                              />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {supervisor.status === 'archived' ? (
                              // Only show delete icon for archived
                              <Tooltip
                                title="Activate Supervisor"
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => handleArchive(supervisor)}
                                  color="success"
                                  sx={{
                                    '&:hover': {
                                      backgroundColor: '#e8f5e8',
                                    },
                                  }}
                                >
                                  <Archive
                                    size={20}
                                    color="#4caf50"
                                    strokeWidth={2}
                                  />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              // Show all action buttons for active/non-archived
                              <>
                                <Tooltip title="Assign Schools">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleAssignSchoolClick(supervisor)}
                                    color="primary"
                                  >
                                    <AssignmentIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Archive Supervisor">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleArchive(supervisor)}
                                    color="error"
                                    sx={{
                                      '&:hover': {
                                        backgroundColor: '#ffebee',
                                      },
                                    }}
                                  >
                                    <Archive
                                      size={20}
                                      color="#f44336"
                                      strokeWidth={2}
                                    />
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
        modalTitle={t('SUPERVISORS.NEW_SUPERVISOR') || 'Add New Supervisor'}
      >
        <AddUserForm
          userType="supervisor"
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

      {/* Assign Schools Dialog */}
      <Dialog
        open={assignSchoolDialogOpen}
        onClose={handleAssignSchoolDialogClose}
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
            Assign Schools to {selectedSupervisor?.firstName}{' '}
            {selectedSupervisor?.lastName}
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
                Select or deselect schools for this supervisor
              </Typography>

              <Divider sx={{ my: 2 }} />

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
                {schoolAssignments.length === 0 ? (
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
                      No schools available for assignment
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Make sure schools are created and active
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {schoolAssignments.map((school, index) => {
                      // Debug first 3 schools
                      if (index < 3) {
                        console.log(`Rendering school ${index}:`, {
                          schoolId: school.schoolId,
                          schoolName: school.schoolName,
                          assigned: school.assigned,
                          assignedType: typeof school.assigned
                        });
                      }
                      return (
                      <React.Fragment key={school.schoolId}>
                        <ListItem disablePadding>
                          <ListItemButton
                            dense
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSchoolCheckboxChange(school.schoolId);
                            }}
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
                                checked={school.assigned || false}
                                tabIndex={-1}
                                disableRipple
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSchoolCheckboxChange(school.schoolId);
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSchoolCheckboxChange(school.schoolId);
                                }}
                              />
                            </ListItemIcon>
                            <ListItemIcon>
                              <SchoolIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight="medium">
                                  {school.schoolName}
                                </Typography>
                              }
                              secondary={
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  School ID: {school.schoolId.substring(0, 8)}...
                                </Typography>
                              }
                            />
                            {school.assigned && (
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
                        <Divider />
                      </React.Fragment>
                      );
                    })}
                  </List>
                )}
              </Box>

              {/* Summary section */}
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    Selected:{' '}
                    {schoolAssignments.filter((school) => school.assigned).length}{' '}
                    schools
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total: {schoolAssignments.length} schools
                  </Typography>
                </Box>
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
            startIcon={assignLoading ? <CircularProgress size={20} /> : null}
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

export default Supervisor;


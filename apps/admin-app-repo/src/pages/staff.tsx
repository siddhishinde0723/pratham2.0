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
                          <Tooltip
                            title={
                              staffMember.status === 'active'
                                ? 'Archive Staff'
                                : 'Activate Staff'
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleArchive(staffMember)}
                              color={
                                staffMember.status === 'active'
                                  ? 'error'
                                  : 'success'
                              }
                              sx={{
                                ...(staffMember.status === 'active' && {
                                  '&:hover': {
                                    backgroundColor: '#ffebee',
                                  },
                                }),
                                ...(staffMember.status === 'archived' && {
                                  '&:hover': {
                                    backgroundColor: '#e8f5e8',
                                  },
                                }),
                              }}
                            >
                              <Archive
                                size={20}
                                color={
                                  staffMember.status === 'active'
                                    ? '#f44336'
                                    : '#4caf50'
                                }
                                strokeWidth={2}
                              />
                            </IconButton>
                          </Tooltip>
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


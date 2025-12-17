/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @nx/enforce-module-boundaries */
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
import { RoleId, RoleName, Status, TenantName } from '@/utils/app.constant';
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
  Badge as BadgeIcon,
  Phone as PhoneIcon,
      CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Pending as PendingIcon,
} from '@mui/icons-material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@/services/UserService';
import { Archive } from 'lucide-react';
import {
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import AddUserForm from '@/components/AddUserForm';
import TenantService from '@/services/TenantService';

const ContentCreator = () => {
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    archived: 0,
  });

  const { t, i18n } = useTranslation();

  const storedUserData = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  useEffect(() => {
    if (response?.result?.totalCount !== 0) {
      searchData({}, 0);
    }
  }, [pageLimit]);
  
  useEffect(() => {
    // Initial load
    searchData({}, 0);
  }, []);

  // Fetch overall counts for content creators (all pages, by status)
  useEffect(() => {
    const fetchSummaryCounts = async () => {
      try {
        const tenantIdLocal = localStorage.getItem('tenantId');
        if (!tenantIdLocal) return;

        const baseParams = {
          limit: 1,
          offset: 0,
          sort: ['createdAt', 'asc'] as any,
        };

        // Total creators for this tenant & role
        const totalResp = await userList({
          ...baseParams,
          filters: { role: RoleName.CONTENT_CREATOR, tenantId: tenantIdLocal },
        });

        // Active creators
        const activeResp = await userList({
          ...baseParams,
          filters: { role: RoleName.CONTENT_CREATOR, tenantId: tenantIdLocal, status: 'active' },
        });

        // Archived creators
        const archivedResp = await userList({
          ...baseParams,
          filters: { role: RoleName.CONTENT_CREATOR, tenantId: tenantIdLocal, status: 'archived' },
        });

        setSummaryCounts({
          total: totalResp?.totalCount || 0,
          active: activeResp?.totalCount || 0,
          archived: archivedResp?.totalCount || 0,
        });
      } catch (e) {
        console.error('Error fetching creator summary counts:', e);
      }
    };

    fetchSummaryCounts();
  }, []);

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

  const searchData = async (formData: any, newPage: any) => {
    // Get tenant ID from localStorage to filter users by tenant
    const tenantId = localStorage.getItem('tenantId');
    const staticFilter = {
      role: RoleName.CONTENT_CREATOR,
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

      console.log('Content Creator: Searching by firstName:', firstName);

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

      console.log('Content Creator: firstName search results:', {
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
      console.log('Content Creator: No results with firstName, searching by username:', firstName);
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
      console.log('Content Creator: username search results:', {
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

  // Helper function to get custom field value
  const getCustomFieldValue = (row: any, fieldLabel: string) => {
    return row.customFields?.find((field: any) => field.label === fieldLabel)
      ?.selectedValues[0]?.value || '-';
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


  // Calculate stats
  const creators = response?.result?.getUserDetails || [];
  const totalCount = response?.result?.totalCount || 0;
  const { total: totalSummary, active: activeCount, archived: archivedCount } = summaryCounts;

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
  const getFullName = (creator: any) => {
    return `${creator.firstName || ''} ${creator.middleName || ''} ${creator.lastName || ''}`.trim();
  };

  // Get initials for avatar
  const getInitials = (creator: any) => {
    const first = creator.firstName?.charAt(0) || '';
    const last = creator.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  // Handle archive
  const handleArchive = async (creator: any) => {
    const userId = creator?.userId;
    const newStatus = creator.status === 'active' ? 'archived' : 'active';

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

  // Determine custom columns based on tenant
  const isSCP = storedUserData.tenantData?.[0]?.tenantName === TenantName.SECOND_CHANCE_PROGRAM;
  const isYouthNet = storedUserData.tenantData?.[0]?.tenantName === TenantName.YOUTHNET;

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
              Content Creators
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage all content creators and their information
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
              {t('COMMON.ADD_NEW')} Content Creator
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
                    Total Creators
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
                    Active Creators
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
                    Archived Creators
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
                placeholder="Search creators by name, username..."
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

        {/* Creators Table */}
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
          ) : creators.length === 0 ? (
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
                {t('COMMON.NO_CONTENT_CREATOR_FOUND') || 'No Content Creators Found'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No content creators available. Try adding a new creator.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Creator Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Contact</TableCell>
                      {isSCP && <TableCell>Board</TableCell>}
                      {isSCP && <TableCell>Medium</TableCell>}
                      {isSCP && <TableCell>Grade</TableCell>}
                      {isSCP && <TableCell>Subject</TableCell>}
                      {isYouthNet && <TableCell>Domain</TableCell>}
                      {isYouthNet && <TableCell>Sub Domain</TableCell>}
                      {isYouthNet && <TableCell>Stream</TableCell>}
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {creators.map((creator: any) => (
                      <TableRow key={creator.userId} hover>
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
                                  creator.status === 'archived'
                                    ? '#757575'
                                    : '#1976d2',
                              }}
                            >
                              {getInitials(creator)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                              >
                                {getFullName(creator)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                ID: {creator.userId?.substring(0, 8)}...
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
                              {creator.username || 'N/A'}
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
                            {creator.mobile ? (
                              <>
                                <PhoneIcon
                                  fontSize="small"
                                  color="action"
                                />
                                <Typography variant="body2">
                                  {creator.mobile}
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
                        {isSCP && (
                          <>
                            <TableCell>{getCustomFieldValue(creator, 'BOARD')}</TableCell>
                            <TableCell>{getCustomFieldValue(creator, 'MEDIUM')}</TableCell>
                            <TableCell>{getCustomFieldValue(creator, 'GRADE')}</TableCell>
                            <TableCell>{getCustomFieldValue(creator, 'SUBJECT')}</TableCell>
                          </>
                        )}
                        {isYouthNet && (
                          <>
                            <TableCell>{getCustomFieldValue(creator, 'DOMAIN')}</TableCell>
                            <TableCell>{getCustomFieldValue(creator, 'SUB-DOMAIN')}</TableCell>
                            <TableCell>{getCustomFieldValue(creator, 'STREAM')}</TableCell>
                          </>
                        )}
                        <TableCell>
                           <Chip
                                label={getStatusText(creator.status)}
                                size="small"
                                color={getStatusColor(creator.status) as any}
                                icon={
                                  getStatusIcon(creator.status) || undefined
                                }
                                variant="outlined"
                              />
                        </TableCell>
                        <TableCell>
                          <Tooltip
                            title={
                              creator.status === 'active'
                                ? 'Archive Creator'
                                : 'Activate Creator'
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleArchive(creator)}
                              color={
                                creator.status === 'active'
                                  ? 'error'
                                  : 'success'
                              }
                              sx={{
                                ...(creator.status === 'active' && {
                                  '&:hover': {
                                    backgroundColor: '#ffebee',
                                  },
                                }),
                                ...(creator.status === 'archived' && {
                                  '&:hover': {
                                    backgroundColor: '#e8f5e8',
                                  },
                                }),
                              }}
                            >
                              <Archive
                                size={20}
                                color={
                                  creator.status === 'active'
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
        modalTitle={t('CONTENT_CREATOR_REVIEWER.CREATE_CONTENT_CREATOR')}
      >
        <AddUserForm
          userType="content-creator"
          onSuccess={() => {
            setSearchTerm('');
            searchData({}, 0);
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

export default ContentCreator;

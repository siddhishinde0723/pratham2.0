/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable prefer-const */
/* eslint-disable @nx/enforce-module-boundaries */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Paper,
  Button,
  ToggleButton,
  ToggleButtonGroup,
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
  Chip,
  IconButton,
  Pagination,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  School as SchoolIcon,
  Sort as SortIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Groups as GroupsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  Divider,
  Checkbox,
  ListItemText as MuiListItemText,
} from '@mui/material';
import CenterForm from '../components/Center/CenterForm';
import AddCenterForm from '../components/Center/AddCenterForm';
import {
  updateCohortUpdate,
  getUserCohorts,
} from '../services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import { debounce } from 'lodash';
import { getCohortList } from '../services/CohortService/cohortService';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// Define types based on your API response
interface CohortCenter {
  cohortId: string;
  parentId: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'pending' | 'archived';
  customFields: any[];
}

// Define sortable columns
type SortableColumn = 'name' | 'createdAt' | 'status' | 'type';
type SortDirection = 'asc' | 'desc';

const Centers = () => {
  const { t } = useTranslation();
  const [centers, setCenters] = useState<CohortCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'pending' | 'archived'
  >('active'); // Default to 'active' to match Classes tab behavior
  const [selectedCluster, setSelectedCluster] = useState('All');
  const [clusters, setClusters] = useState<CohortCenter[]>([]);

  // Add Center Dialog State
  const [openAddCenter, setOpenAddCenter] = useState(false);

  // Summary counts state
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0,
    pending: 0,
  });

  // Dialog states
  const [openForm, setOpenForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CohortCenter | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [centerToUpdate, setCenterToUpdate] = useState<CohortCenter | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [assignClassDialogOpen, setAssignClassDialogOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [allClasses, setAllClasses] = useState<CohortCenter[]>([]);
  const [selectedCenterForAssignment, setSelectedCenterForAssignment] = useState<CohortCenter | null>(null);
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<SortableColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort
  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

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

  // Fetch summary counts for all centers
  const fetchSummaryCounts = useCallback(async () => {
    try {
      // Logic to fetch all or use existing API if available that returns counts (optimized approach)
      // For now, replicating behavior: Fetch high limit to get broad stats or if API supports count-only, use that
      // Assuming 'COHORT' type equivalent which is 'SCHOOL' here for Centers
      // Note: fetching *all* might be heavy, check if existing services offer summary.
      // Replicating logic from Classes page which iterates to get counts:
        
      let allCohorts: any[] = [];
      let offset = 0;
      let limit = 200; 
      let hasMore = true;
      
      // CAUTION: This loop works if total < ~2000 reasonably fast. For large datasets, backend summary API is better.
      // Strictly following Classes page logic as requested.
      while (hasMore) {
        const response = await getCohortList({
          limit,
          offset,
          filters: { type: 'SCHOOL' }, // Only difference: filters type SCHOOL
        });
        
        let batch: any[] = [];
         if (response?.results?.cohortDetails && Array.isArray(response.results.cohortDetails)) {
          batch = response.results.cohortDetails;
        } else if (Array.isArray(response)) {
          batch = response;
        }

        if (batch.length > 0) {
          allCohorts = [...allCohorts, ...batch];
          offset += limit;
          if (batch.length < limit) {
             hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setSummaryCounts({
        total: allCohorts.length,
        active: allCohorts.filter(c => c.status === 'active').length,
        inactive: allCohorts.filter(c => c.status === 'inactive').length,
        archived: allCohorts.filter(c => c.status === 'archived').length,
        pending: allCohorts.filter(c => c.status === 'pending').length,
      });

    } catch (err) {
      console.error('Error fetching summary counts:', err);
    }
  }, []);


  // Fetch centers (Schools) from API
  const fetchCenters = useCallback(async () => {
    setLoading(true);

    try {
      // Build filters based on selections
      const filters: any = {
        type: 'SCHOOL',
        ...(statusFilter !== 'all' && { status: [statusFilter] }),
        ...(searchTerm && { name: searchTerm }),
      };

      // Filter by Cluster
      if (selectedCluster !== 'All') {
        filters.parentId = [selectedCluster];
      }

      console.log('Fetching centers (schools) with filters:', filters);

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
          const totalCount = response.count ?? response.results.count ?? centersData.length;
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
      showToastMessage('Failed to fetch centers', 'error');
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
    searchTerm,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchClusters();
    fetchSummaryCounts();
    fetchAllClasses();
  }, [fetchClusters, fetchSummaryCounts]);

  // Fetch centers whenever filters change
  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  // Handle search with debounce
  const debouncedSetSearch = useCallback(
    useMemo(
      () =>
        debounce((value: string) => {
          setSearchTerm(value);
          setPagination((prev) => ({ ...prev, page: 0 }));
        }, 500),
      []
    ),
    []
  );

  const handleSearch = (term: string) => {
    debouncedSetSearch(term);
  };

  // Handle cluster filter change
  const handleClusterChange = (event: SelectChangeEvent) => {
    const newCluster = event.target.value;
    setSelectedCluster(newCluster);
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage - 1 })); // MUI Pagination is 1-indexed
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: SelectChangeEvent) => {
    const newLimit = parseInt(event.target.value, 10);
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 0,
    }));
  };

  // Helper to get custom field value
  const getCustomFieldValue = (row: any, label: string) => {
    return row.customFields?.find((field: any) => field.label === label)?.selectedValues?.[0]?.value || '-';
  };

  // Handle add/edit center
  const handleAddCenter = () => {
    setOpenAddCenter(true);
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
        type: 'SCHOOL',
      };

      const response = await updateCohortUpdate(
        centerToUpdate.cohortId,
        updateData
      );

      if (response?.responseCode === 200 || response?.success) {
        await fetchCenters();
        await fetchSummaryCounts(); // Refresh summary counts
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
    fetchSummaryCounts();
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    try {
      await fetchCenters();
      await fetchSummaryCounts();
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setOpenForm(false);
      setEditingCenter(null);
    }
  };

  const handleAssignClassDialogClose = () => {
    setAssignClassDialogOpen(false);
    setSelectedCenterForAssignment(null);
    setSelectedClassIds([]);
  };

  // Fetch all classes for assignment
  const fetchAllClasses = useCallback(async () => {
    try {
      const response = await getCohortList({
        limit: 0,
        offset: 0,
        filters: { type: 'COHORT' }
      });
      
      let classes: any[] = [];
      if (response?.results?.cohortDetails && Array.isArray(response.results.cohortDetails)) {
        classes = response.results.cohortDetails;
      } else if (Array.isArray(response)) {
        classes = response;
      }
      setAllClasses(classes);
    } catch (err) {
      console.error('Error fetching all classes:', err);
    }
  }, []);

  const handleAssignClassClick = (center: CohortCenter) => {
    setSelectedCenterForAssignment(center);
    setAssignClassDialogOpen(true);
    
    // Predetermine currently assigned classes
    const currentlyAssigned = allClasses
      .filter(cls => cls.parentId === center.cohortId)
      .map(cls => cls.cohortId);
    setSelectedClassIds(currentlyAssigned);
    
    // Auto-expand the current center in the list if applicable
    setExpandedGroups(new Set([center.cohortId]));
  };
  
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return Array.from(newSet);
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedCenterForAssignment) return;
    
    setAssignLoading(true);
    try {
      // Find classes that were assigned but now unselected, and vice versa
      const currentAssigned = allClasses.filter(cls => cls.parentId === selectedCenterForAssignment.cohortId);
      const currentAssignedIds = currentAssigned.map(cls => cls.cohortId);
      
      const toAssign = selectedClassIds.filter(id => !currentAssignedIds.includes(id));
      const toUnassign = currentAssignedIds.filter(id => !selectedClassIds.includes(id));
      
      const promises = [
        ...toAssign.map(id => updateCohortUpdate(id, { parentId: selectedCenterForAssignment.cohortId, type: 'COHORT' })),
        ...toUnassign.map(id => updateCohortUpdate(id, { parentId: '', type: 'COHORT' })) // Or some other way to unassign
      ];
      
      await Promise.all(promises);
      showToastMessage('Class assignments updated successfully', 'success');
      await fetchAllClasses();
      handleAssignClassDialogClose();
    } catch (err) {
      console.error('Error saving assignments:', err);
      showToastMessage('Failed to update class assignments', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  // Status Filter Change
  const handleStatusChange = (
    event: React.MouseEvent<HTMLElement>,
    newStatus: 'all' | 'active' | 'inactive' | 'pending' | 'archived'
  ) => {
    if (newStatus !== null) {
      setStatusFilter(newStatus);
      setPagination((prev) => ({ ...prev, page: 0 }));
    }
  };

  // Define table columns matching Classes style
  const columns = [
    { key: 'name', label: t('CENTERS.CENTER') },
    { key: 'cohortId', label: "Center Code" },
    {
        key: 'cluster',
        label: 'Cluster', // Could add translation key
        render: (row: CohortCenter) => {
             const cluster = clusters.find(c => c.cohortId === row.parentId);
             return cluster ? cluster.name : row.parentId;
        }
    },
    // {
    //   key: 'block',
    //   label: t('COMMON.BLOCK'),
    //   render: (row: any) => getCustomFieldValue(row, 'BLOCK'),
    // },
    // {
    //   key: 'district',
    //   label: t('COMMON.DISTRICT'),
    //   render: (row: any) => getCustomFieldValue(row, 'DISTRICT'),
    // },
    {
        key: 'status',
        label: 'Status',
        render: (row: CohortCenter) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {row.status === 'active' ? (
                <CheckCircleIcon sx={{ color: 'green', fontSize: '14px', marginRight: '4px' }} />
            ) : (
                <CancelIcon sx={{ color: 'red', fontSize: '14px', marginRight: '4px' }} />
            )}
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {row.status}
            </Typography>
            </Box>
        )
    }
  ];


  return (
    <Box>
      {/* Header Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}
      >
        <Box>
          <Typography variant="h2" sx={{ marginBottom: '5px', fontWeight: 'bold' }}>
            {t('CENTERS.CENTERS')}
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '20px', color: '#555' }}>
            Manage all centers and their details
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
              textTransform: 'none'
            }}
          >
            Add New Center
          </Button>
        </Box>
      </Box>
        
        {/* Widgets Row */}
        <Box sx={{ display: 'flex', gap: 2, marginBottom: 3, flexWrap: 'wrap' }}>
            <Paper elevation={0} sx={{ flex: 1, padding: 2, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #1E88E5' }}>
                <SchoolIcon sx={{ fontSize: 40, color: '#1E88E5' }} />
                <Box>
                <Typography variant="h4" fontWeight="bold">{summaryCounts.total}</Typography>
                <Typography variant="body2" color="textSecondary">Total Centers</Typography>
                </Box>
            </Paper>
            <Paper elevation={0} sx={{ flex: 1, padding: 2, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #4CAF50' }}>
                <GroupsIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
                <Box>
                <Typography variant="h4" fontWeight="bold">{summaryCounts.active}</Typography>
                <Typography variant="body2" color="textSecondary">Active Centers</Typography>
                </Box>
            </Paper>
            <Paper elevation={0} sx={{ flex: 1, padding: 2, border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #FF9800' }}>
                <GroupsIcon sx={{ fontSize: 40, color: '#FF9800' }} />
                <Box>
                <Typography variant="h4" fontWeight="bold">{summaryCounts.inactive}</Typography>
                <Typography variant="body2" color="textSecondary">Inactive Centers</Typography>
                </Box>
            </Paper>
        </Box>

      <Paper 
        elevation={0}
        sx={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #E0E0E0'
        }}
      >

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
           {/* Left: Status Toggle */}
            <ToggleButtonGroup
                color="primary"
                value={statusFilter}
                exclusive
                onChange={handleStatusChange}
                size="small"
                sx={{ height: '40px' }}
            >
                <ToggleButton value="active" sx={{ textTransform: 'none', px: 3 }}>
                    Active
                </ToggleButton>
                <ToggleButton value="inactive" sx={{ textTransform: 'none', px: 3 }}>
                    Inactive
                </ToggleButton>
            </ToggleButtonGroup>


          {/* Right: Search and Filters */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                        variant="outlined"
                        placeholder={t('Search')} 
                        size="small"
                        onChange={(e) => handleSearch(e.target.value)}
                        InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                            <SearchIcon />
                            </InputAdornment>
                        ),
                        }}
                        sx={{ minWidth: '250px' }}
                />

                <FormControl size="small" sx={{ minWidth: '200px' }}>
                    <InputLabel>Search by Cluster</InputLabel>
                    <Select
                    value={selectedCluster}
                    label="Search by Cluster"
                    onChange={handleClusterChange}
                    >
                    <MenuItem value="All">All Clusters</MenuItem>
                    {clusters.map((cluster) => (
                        <MenuItem key={cluster.cohortId} value={cluster.cohortId}>
                        {cluster.name}
                        </MenuItem>
                    ))}
                    </Select>
                </FormControl>
          </Box>
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
          ) : centers.length === 0 ? (
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
                No Centers Found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchTerm ||
                selectedCluster !== 'All' ||
                statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No centers available.'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'name'}
                          direction={
                            sortBy === 'name' ? sortDirection : 'asc'
                          }
                          onClick={() => handleSort('name')}
                        >
                           {t('CENTERS.CENTER')}
                        </TableSortLabel>
                      </TableCell>
                      
                        <TableCell>Center Code</TableCell>
                      
                        <TableCell>Cluster</TableCell>

                        {/* <TableCell>{t('COMMON.BLOCK')}</TableCell>
  
                        <TableCell>{t('COMMON.DISTRICT')}</TableCell> */}
 
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'status'}
                            direction={
                              sortBy === 'status' ? sortDirection : 'asc'
                            }
                            onClick={() => handleSort('status')}
                          >
                             {t('Status')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {centers.map((center) => {
                      const cluster = clusters.find(c => c.cohortId === center.parentId);
                      const clusterName = cluster ? cluster.name : center.parentId;

                      return (
                        <TableRow key={center.cohortId} hover>
                          
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                }}
                              >
                                <Typography variant="body2" fontWeight="medium">
                                  {center.name}
                                </Typography>
                              </Box>
                            </TableCell>
                                                      <TableCell>
                                    <Tooltip title={center.cohortId}>
                                        <Chip
                                            label={center.cohortId.substring(0, 8) + '...'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Tooltip>
                                </TableCell>
                          
                            <TableCell>
                                {clusterName}
                            </TableCell>

                            {/* <TableCell>
                                {getCustomFieldValue(center, 'BLOCK')}
                            </TableCell>
                            
                            <TableCell>
                                {getCustomFieldValue(center, 'DISTRICT')}
                            </TableCell> */}

                            <TableCell>
                                <Chip
                                label={center.status ? center.status.charAt(0).toUpperCase() + center.status.slice(1) : ''}
                                size="small"
                                color={center.status === 'active' ? 'success' : center.status === 'inactive' ? 'error' : 'default'}
                                icon={
                                  center.status === 'active' ? <CheckCircleIcon fontSize="small" /> : 
                                  center.status === 'inactive' ? <CancelIcon fontSize="small" /> : undefined
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {center.status === 'archived' ? (
                                  <Tooltip title="Activate">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleArchiveCenter(center)}
                                      color="default"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <>
                                    {/* <Tooltip title="Assign Class">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleAssignClassClick(center)}
                                        color="primary"
                                      >
                                        <AssignmentIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip> */}
                                    <Tooltip title="Edit Center">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditCenter(center)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    {/* <Tooltip title="Archive">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleArchiveCenter(center)}
                                        color="error"
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip> */}
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.total > 0 && (
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
                    onChange={(_, page) => handlePageChange(page)} // Pagination component is 1-based
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      
      {/* Add Center Form Dialog */}
      <AddCenterForm
        open={openAddCenter}
        onClose={() => setOpenAddCenter(false)}
        onSuccess={handleRefresh}
      />

      {/* Center Form Dialog (Edit) */}
      {openForm && (
        <CenterForm
          {...({
            open: openForm,
            onClose: () => setOpenForm(false),
            onSubmit: handleFormSubmit,
            center: editingCenter,
            isCenter: true,
            parentName: editingCenter ? clusters.find(c => c.cohortId === editingCenter.parentId)?.name || editingCenter.parentId : ''
          } as any)}
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
            ? 'Archive Center'
            : 'Activate Center'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {centerToUpdate?.status === 'active'
              ? `Are you sure you want to archive the center "${centerToUpdate?.name}"?`
              : `Are you sure you want to activate the center "${centerToUpdate?.name}"?`}
          </Typography>
          {centerToUpdate?.status === 'active' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Archived centers will be hidden from active view and marked as inactive.
            </Alert>
          )}
          {centerToUpdate?.status === 'archived' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Activating this center will make it visible and available for use.
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
            Assign Classes to {selectedCenterForAssignment?.name}
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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Select classes to assign to this center. Unselected classes that were assigned will be removed.
              </Typography>
              
              <TextField
                fullWidth
                size="small"
                placeholder="Search classes..."
                value={assignmentSearchTerm}
                onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ flex: 1, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <List>
                  {(() => {
                    // Group classes by their current parent or "Unassigned"
                    const filtered = allClasses.filter(cls => 
                      cls.name.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                    );
                    
                    const groups: Record<string, CohortCenter[]> = {};
                    filtered.forEach(cls => {
                      const groupKey = cls.parentId || 'unassigned';
                      if (!groups[groupKey]) groups[groupKey] = [];
                      groups[groupKey].push(cls);
                    });

                    return Object.entries(groups).map(([parentId, groupClasses]) => {
                      const parentCenter = clusters.find(c => c.cohortId === parentId) || 
                                          centers.find(c => c.cohortId === parentId);
                      const groupName = parentCenter ? parentCenter.name : (parentId === 'unassigned' ? 'Unassigned Classes' : parentId);
                      
                      return (
                        <React.Fragment key={parentId}>
                          <ListItem sx={{ bgcolor: 'action.hover', py: 0.5 }}>
                            <MuiListItemText 
                              primary={groupName} 
                              primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }} 
                            />
                          </ListItem>
                          {groupClasses.map((cls) => (
                            <ListItem key={cls.cohortId} dense>
                              <ListItemButton onClick={() => handleToggleClass(cls.cohortId)}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <Checkbox
                                    edge="start"
                                    checked={selectedClassIds.includes(cls.cohortId)}
                                    tabIndex={-1}
                                    disableRipple
                                  />
                                </ListItemIcon>
                                <MuiListItemText 
                                  primary={cls.name} 
                                  secondary={`ID: ${cls.cohortId.substring(0, 8)}...`}
                                />
                                {cls.parentId === selectedCenterForAssignment?.cohortId && (
                                  <Chip label="Currently Assigned" size="small" variant="outlined" color="success" />
                                )}
                              </ListItemButton>
                            </ListItem>
                          ))}
                          <Divider />
                        </React.Fragment>
                      );
                    });
                  })()}
                </List>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleAssignClassDialogClose} color="inherit">Cancel</Button>
          <Button 
            onClick={handleSaveAssignments} 
            variant="contained" 
            disabled={assignLoading}
          >
            {assignLoading ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default Centers;

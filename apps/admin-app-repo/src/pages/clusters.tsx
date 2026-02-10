import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  Pagination,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  School as SchoolIcon,
  Groups as GroupsIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  getCohortList,
  updateCohortUpdate,
} from '../services/CohortService/cohortService';
import { showToastMessage } from '@/components/Toastify';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import ClusterForm from '../components/Cluster/ClusterForm';
import Container from '@mui/material/Container';

interface Cluster {
  cohortId: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

type SortableColumn = 'name' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

const ClustersPage = () => {
  const { t } = useTranslation();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [sortBy, setSortBy] = useState<SortableColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
  });

  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const [openForm, setOpenForm] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);

  const fetchSummaryCounts = useCallback(async () => {
    try {
      let allClusters: any[] = [];
      let offset = 0;
      let limit = 200;
      let hasMore = true;
      while (hasMore) {
        const response = await getCohortList({
          limit,
          offset,
          filters: { type: 'CLUSTER' },
        });
        let batch: any[] = [];
        if (response?.results?.cohortDetails) {
          batch = response.results.cohortDetails;
        } else if (Array.isArray(response)) {
          batch = response;
        }
        if (batch.length > 0) {
          allClusters = [...allClusters, ...batch];
          offset += limit;
          if (batch.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      setSummaryCounts({
        total: allClusters.length,
        active: allClusters.filter(c => c.status === 'active').length,
        inactive: allClusters.filter(c => c.status === 'inactive' || c.status === 'archived').length,
      });
    } catch (err) {
      console.error('Error fetching summary counts:', err);
    }
  }, []);

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {
        type: 'CLUSTER',
        status: [statusFilter],
        ...(searchTerm && { name: searchTerm }),
      };

      const response = await getCohortList({
        limit: pagination.limit,
        offset: pagination.page * pagination.limit,
        sort: [sortBy, sortDirection],
        filters,
      });

      if (response?.results?.cohortDetails) {
        setClusters(response.results.cohortDetails);
        setPagination(prev => ({
          ...prev,
          total: response.count ?? response.results.count ?? response.results.cohortDetails.length,
        }));
      } else if (Array.isArray(response)) {
        setClusters(response);
        setPagination(prev => ({ ...prev, total: response.length }));
      }
    } catch (err: any) {
      console.error('Error fetching clusters:', err);
      showToastMessage('Failed to fetch clusters', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortDirection, statusFilter, searchTerm]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  useEffect(() => {
    fetchSummaryCounts();
  }, [fetchSummaryCounts]);

  const handleRefresh = () => {
    fetchClusters();
    fetchSummaryCounts();
  };

  const handleSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
        setPagination(prev => ({ ...prev, page: 0 }));
      }, 500),
    []
  );

  const handleStatusChange = (event: any, newStatus: 'active' | 'archived') => {
    if (newStatus !== null) {
      setStatusFilter(newStatus);
      setPagination(prev => ({ ...prev, page: 0 }));
    }
  };

  const handlePageChange = (event: any, value: number) => {
    setPagination(prev => ({ ...prev, page: value - 1 }));
  };

  const handleRowsPerPageChange = (event: any) => {
    setPagination(prev => ({ ...prev, limit: parseInt(event.target.value, 10), page: 0 }));
  };

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleAddCluster = () => {
    setEditingCluster(null);
    setOpenForm(true);
  };

  const handleEditCluster = (cluster: Cluster) => {
    setEditingCluster(cluster);
    setOpenForm(true);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Clusters</Typography>
          <Typography variant="body2" color="textSecondary">Manage all clusters and their details</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAddCluster}
            sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' }, textTransform: 'none' }}
          >
            Add New Cluster
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #1976d2' }}>
          <SchoolIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>{summaryCounts.total}</Typography>
            <Typography variant="body2" color="textSecondary">Total Clusters</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #4caf50' }}>
          <GroupsIcon sx={{ fontSize: 40, color: '#4caf50' }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>{summaryCounts.active}</Typography>
            <Typography variant="body2" color="textSecondary">Active Clusters</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #ff9800' }}>
          <GroupsIcon sx={{ fontSize: 40, color: '#ff9800' }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>{summaryCounts.inactive}</Typography>
            <Typography variant="body2" color="textSecondary">Inactive Clusters</Typography>
          </Box>
        </Paper>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusChange}>
            <ToggleButton value="active" sx={{ color: '#4caf50', '&.Mui-selected': { bgcolor: '#e8f5e8', color: '#4caf50' } }}>
              Active
            </ToggleButton>
            <ToggleButton value="archived" sx={{ color: '#ff9800', '&.Mui-selected': { bgcolor: '#fff3e0', color: '#ff9800' } }}>
              Inactive
            </ToggleButton>
          </ToggleButtonGroup>
          <TextField
            size="small"
            placeholder="Search clusters..."
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
            sx={{ flexGrow: 1, maxWidth: 300 }}
          />
        </Box>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><TableSortLabel active={sortBy === 'name'} direction={sortDirection} onClick={() => handleSort('name')}>Cluster Name</TableSortLabel></TableCell>
              <TableCell>Cluster ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}><CircularProgress /></TableCell></TableRow>
            ) : clusters.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>No clusters found</TableCell></TableRow>
            ) : (
              clusters.map((cluster) => (
                <TableRow key={cluster.cohortId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {cluster.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={cluster.cohortId}>
                      <Chip
                        label={cluster.cohortId.substring(0, 8) + '...'}
                        size="small"
                        variant="outlined"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cluster.status ? cluster.status.charAt(0).toUpperCase() + cluster.status.slice(1) : ''}
                      size="small"
                      color={cluster.status === 'active' ? 'success' : cluster.status === 'archived' ? 'warning' : 'default'}
                      icon={
                        cluster.status === 'active' ? <CheckCircleIcon fontSize="small" /> : 
                        cluster.status === 'archived' ? <CancelIcon fontSize="small" /> : undefined
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Cluster">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditCluster(cluster)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {pagination.total > pagination.limit && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="textSecondary">Rows per page:</Typography>
              <Select size="small" value={pagination.limit} onChange={handleRowsPerPageChange} sx={{ minWidth: 70 }}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
              </Select>
            </Box>
            <Pagination count={Math.ceil(pagination.total / pagination.limit)} page={pagination.page + 1} onChange={handlePageChange} color="primary" showFirstButton showLastButton />
          </Box>
        )}
      </TableContainer>

      <ClusterForm open={openForm} onClose={() => setOpenForm(false)} onSubmit={handleRefresh} cluster={editingCluster} />
    </Container>
  );
};

export async function getStaticProps({ locale }: any) {
  return { props: { ...(await serverSideTranslations(locale, ['common'])) } };
}

export default ClustersPage;

/* eslint-disable @nx/enforce-module-boundaries */
import React, { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField,
  InputAdornment,
  Checkbox,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { Phone as PhoneIcon, Badge as BadgeIcon } from '@mui/icons-material';
import { userList } from '@/services/UserList';
import { debounce } from 'lodash';
import { searchGroups, addUserToGroup } from '../services/GroupService';
import LocationService from '../services/LocationService';
import { SelectChangeEvent } from '@mui/material';

interface Group {
  id: string;
  name: string;
  description: string;
}

interface User {
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  username?: string;
   mobile?: string;
  status: string;
  customFields?: Record<string, unknown>[];
}

const AddUsersToGroups: React.FC = () => {
  const { t } = useTranslation();
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // API-related states
  const [searchTerm, setSearchTerm] = useState('');
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [response, setResponse] = useState<{ result?: { getUserDetails?: User[] } }>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Location filter states - storing IDs
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    block: '',
    village: '',
  });
  
  // Location data states
  const [states, setStates] = useState<Array<{id: string, name: string}>>([]);
  const [districts, setDistricts] = useState<Array<{id: string, name: string}>>([]);
  const [blocks, setBlocks] = useState<Array<{id: string, name: string}>>([]);
  const [villages, setVillages] = useState<Array<{id: string, name: string}>>([]);
  const [loadingLocations, setLoadingLocations] = useState({
    states: false,
    districts: false,
    blocks: false,
    villages: false
  });

  const buildSearchData = (value: string): Record<string, string> =>
    value.trim() ? { firstName: value.trim() } : {};

  useEffect(() => {
    loadGroups();
    loadStates();
  }, []);
  
  // Load users when filters change
  useEffect(() => {
    loadUsers({}, 0);
  }, [filters, searchTerm, pageLimit]);

  // Load groups
  const loadGroups = async () => {
    try {
      const groupsResult = await searchGroups({
        limit: 100,
        offset: 0,
        filters: {
          type: 'ADHOC-Group',
          status: ['Active']
        }
      });
      
      const groupsData = groupsResult.groups
        .filter(group => group.status === 'Active')
        .map(group => ({
          id: group.id,
          name: group.name,
          description: group.description || ''
        }));
      
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups. Please try again.');
    }
  };

  // Load location data
  const loadStates = async () => {
    console.log('Loading states...');
    setLoadingLocations(prev => ({ ...prev, states: true }));
    try {
      const statesData = await LocationService.getStates();
      console.log('States loaded:', statesData);
      setStates(statesData);
    } catch (error) {
      console.error('Failed to load states:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, states: false }));
    }
  };

  const loadDistricts = async (stateId: string) => {
    if (!stateId) {
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      return;
    }
    
    console.log('Loading districts for state ID:', stateId);
    setLoadingLocations(prev => ({ ...prev, districts: true }));
    try {
      const districtsData = await LocationService.getDistricts(stateId);
      console.log('Districts loaded:', districtsData);
      setDistricts(districtsData);
      setBlocks([]);
      setVillages([]);
    } catch (error) {
      console.error('Failed to load districts:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, districts: false }));
    }
  };

  const loadBlocks = async (districtId: string) => {
    if (!districtId) {
      setBlocks([]);
      setVillages([]);
      return;
    }
    
    console.log('Loading blocks for district ID:', districtId);
    setLoadingLocations(prev => ({ ...prev, blocks: true }));
    try {
      const blocksData = await LocationService.getBlocks(districtId);
      console.log('Blocks loaded:', blocksData);
      setBlocks(blocksData);
      setVillages([]);
    } catch (error) {
      console.error('Failed to load blocks:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, blocks: false }));
    }
  };

  const loadVillages = async (blockId: string) => {
    if (!blockId) {
      setVillages([]);
      return;
    }
    
    console.log('Loading villages for block ID:', blockId);
    setLoadingLocations(prev => ({ ...prev, villages: true }));
    try {
      const villagesData = await LocationService.getVillages(blockId);
      console.log('Villages loaded:', villagesData);
      setVillages(villagesData);
    } catch (error) {
      console.error('Failed to load villages:', error);
    } finally {
      setLoadingLocations(prev => ({ ...prev, villages: false }));
    }
  };

  // Build location filters for hierarchical search
  const buildLocationFilters = () => {
    const locationFilters: {
      state?: string[];
      district?: string[];
      block?: string[];
      village?: string[];
    } = {};
    
    if (filters.state) {
      locationFilters.state = [filters.state];
    }
    if (filters.district) {
      locationFilters.district = [filters.district];
    }
    if (filters.block) {
      locationFilters.block = [filters.block];
    }
    if (filters.village) {
      locationFilters.village = [filters.village];
    }
    
    return locationFilters;
  };

  // Load users with location filters and sequential search
  const loadUsers = async (searchDataParam: Record<string, string> = {}, newPage = 0) => {
    setIsLoadingUsers(true);
    try {
      const tenantId = localStorage.getItem('tenantId') || undefined;
      // Align with desired payload: sort by createdAt asc
      const staticSort = ['createdAt', 'asc'];
      const offsetValue = newPage * pageLimit;

      // Get search term from searchDataParam or searchTerm state
      const searchTermValue = searchDataParam.firstName || searchDataParam.username || searchTerm || '';

      // Always use regular search API with location filters passed as arrays of IDs
      const locationFilters = buildLocationFilters(); // { state: ['id'], district: ['id'], ... }

      const staticFilter = {
        role: 'Learner',
        tenantId: tenantId,
        ...locationFilters,
      };

      if (searchTermValue) {
        // Sequential search: First by firstName, then by username if no results
        // First, try searching by firstName
        const filtersFirstName = {
          ...staticFilter,
          firstName: searchTermValue,
        };

        const dataFirstName = {
          limit: pageLimit,
          offset: offsetValue,
          sort: staticSort,
          filters: filtersFirstName,
        };

        console.log('Add Users to Groups: Searching by firstName with filters:', filtersFirstName);

        const respFirstName = await userList(dataFirstName);
        const totalCountFirstName = respFirstName?.totalCount || 0;
        const userDetailsFirstName = respFirstName?.getUserDetails || [];

        console.log('Add Users to Groups: firstName search results:', {
          totalCount: totalCountFirstName,
          usersFound: userDetailsFirstName.length,
        });

          // If results found with firstName, use those results
        if (totalCountFirstName > 0 && userDetailsFirstName.length > 0) {
            setCurrentPage(newPage);
            setTotalCount(totalCountFirstName);
          setResponse({ result: respFirstName });
          return;
        }

        // If no results with firstName, try searching by username
        console.log('Add Users to Groups: No results with firstName, searching by username');
        const filtersUsername = {
          ...staticFilter,
          username: searchTermValue,
        };

        const dataUsername = {
          limit: pageLimit,
          offset: offsetValue,
          sort: staticSort,
          filters: filtersUsername,
        };

        const respUsername = await userList(dataUsername);
        console.log('Add Users to Groups: username search results:', {
          totalCount: respUsername?.totalCount || 0,
          usersFound: (respUsername?.getUserDetails || []).length,
        });

        setCurrentPage(newPage);
        setTotalCount(respUsername?.totalCount || 0);
        setResponse({ result: respUsername });
      } else {
        // No search term, load all learners with location filters (if any)
        const data = {
          limit: pageLimit,
          offset: offsetValue,
          sort: staticSort,
          filters: staticFilter,
        };

        console.log('Add Users to Groups: Loading users with filters:', data);

        const resp = await userList(data);
        setCurrentPage(newPage);
        setTotalCount(resp?.totalCount || 0);
        setResponse({ result: resp });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Debounced search
  const debouncedSearch = debounce((searchTermValue: string) => {
    const searchData = buildSearchData(searchTermValue);
    loadUsers(searchData, 0);
  }, 500);

  const handleGroupChange = (event: SelectChangeEvent<string>) => {
    setSelectedGroup(event.target.value as string);
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    if (value.trim() === '') {
      // Immediate reload when clearing search
      loadUsers({}, 0);
    } else {
      debouncedSearch(value);
    }
  };

  const handleRowsPerPageChange = (event: SelectChangeEvent<string>) => {
    const newLimit = parseInt(event.target.value, 10);
    setPageLimit(newLimit);
    setCurrentPage(0);
    const searchData = buildSearchData(searchTerm);
    loadUsers(searchData, 0);
  };

  const getFullName = (user: User) =>
    `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim() || 'Unknown';

  const getStatusColor = (status?: string) => {
    if (!status) return 'default';
    const normalized = status.toLowerCase();
    if (normalized === 'active') return 'success';
    if (normalized === 'archived' || normalized === 'inactive') return 'default';
    return 'default';
  };

  const handleSelectAll = () => {
    if (response?.result?.getUserDetails) {
      const allIds = response.result.getUserDetails.map((user: User) => user.userId);
      setSelectedUsers(allIds);
    }
  };

  const handleDeselectAll = () => {
    setSelectedUsers([]);
  };
  
  // Handle location filter changes with cascading
  const handleFilterChange = (field: string) => (event: SelectChangeEvent<string>) => {
    const value = event.target.value as string;
    console.log(`Filter change: ${field} = ${value}`);
    
    // Handle cascading location filters - store IDs instead of names
    if (field === 'state') {
      console.log('State changed, clearing dependent data');
      const selectedState = value ? states.find(s => s.name === value) : null;
      const stateId = selectedState ? selectedState.id : '';
      
      setFilters(prev => ({
        ...prev,
        [field]: stateId, // Store ID instead of name
        district: '',
        block: '',
        village: ''
      }));
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      
      // Load districts for selected state
      if (stateId) {
        console.log('Selected state ID:', stateId);
        loadDistricts(stateId);
      }
    } else if (field === 'district') {
      console.log('District changed, clearing dependent data');
      const selectedDistrict = value ? districts.find(d => d.name === value) : null;
      const districtId = selectedDistrict ? selectedDistrict.id : '';
      
      setFilters(prev => ({
        ...prev,
        [field]: districtId, // Store ID instead of name
        block: '',
        village: ''
      }));
      setBlocks([]);
      setVillages([]);
      
      // Load blocks for selected district
      if (districtId) {
        console.log('Selected district ID:', districtId);
        loadBlocks(districtId);
      }
    } else if (field === 'block') {
      console.log('Block changed, clearing dependent data');
      const selectedBlock = value ? blocks.find(b => b.name === value) : null;
      const blockId = selectedBlock ? selectedBlock.id : '';
      
      setFilters(prev => ({
        ...prev,
        [field]: blockId, // Store ID instead of name
        village: ''
      }));
      setVillages([]);
      
      // Load villages for selected block
      if (blockId) {
        console.log('Selected block ID:', blockId);
        loadVillages(blockId);
      }
    } else if (field === 'village') {
      // For village, store ID instead of name
      const selectedVillage = value ? villages.find(v => v.name === value) : null;
      const villageId = selectedVillage ? selectedVillage.id : '';
      
      setFilters(prev => ({
        ...prev,
        [field]: villageId, // Store ID instead of name
      }));
    } else {
      // For other fields, just update the filter
      setFilters(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  const clearFilters = () => {
    setFilters({
      state: '',
      district: '',
      block: '',
      village: '',
    });
    setDistricts([]);
    setBlocks([]);
    setVillages([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const promises = selectedUsers.map(userId => 
        addUserToGroup(selectedGroup, userId)
      );
      await Promise.all(promises);
      
      setSuccess(true);
      setSelectedUsers([]);
      console.log('Users successfully added to group');
    } catch (err) {
      console.error('Failed to add users to group:', err);
      setError('Failed to add users to group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedUserNames = response?.result?.getUserDetails
    ?.filter((user: User) => selectedUsers.includes(user.userId))
    .map((user: User) => `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim()) || [];

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('GROUPS.ADD_USERS_TO_GROUPS')}
        </Typography>
        
        <Box sx={{ maxWidth: '100%' }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('GROUPS.SELECT_GROUP')}</InputLabel>
                  <Select
                    value={selectedGroup}
                    onChange={handleGroupChange}
                    label={t('GROUPS.SELECT_GROUP')}
                    required
                  >
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Filter Users by Location
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>State</InputLabel>
                      <Select
                        value={filters.state ? states.find(s => s.id === filters.state)?.name || '' : ''}
                        onChange={handleFilterChange('state')}
                        label="State"
                        disabled={loadingLocations.states}
                      >
                        <MenuItem value="">All States</MenuItem>
                        {states.map(state => (
                          <MenuItem key={state.id} value={state.name}>{state.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>District</InputLabel>
                      <Select
                        value={filters.district ? districts.find(d => d.id === filters.district)?.name || '' : ''}
                        onChange={handleFilterChange('district')}
                        label="District"
                        disabled={loadingLocations.districts || !filters.state}
                      >
                        <MenuItem value="">All Districts</MenuItem>
                        {districts.map(district => (
                          <MenuItem key={district.id} value={district.name}>{district.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Block</InputLabel>
                      <Select
                        value={filters.block ? blocks.find(b => b.id === filters.block)?.name || '' : ''}
                        onChange={handleFilterChange('block')}
                        label="Block"
                        disabled={loadingLocations.blocks || !filters.district}
                      >
                        <MenuItem value="">All Blocks</MenuItem>
                        {blocks.map(block => (
                          <MenuItem key={block.id} value={block.name}>{block.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Village</InputLabel>
                      <Select
                        value={filters.village ? villages.find(v => v.id === filters.village)?.name || '' : ''}
                        onChange={handleFilterChange('village')}
                        label="Village"
                        disabled={loadingLocations.villages || !filters.block}
                      >
                        <MenuItem value="">All Villages</MenuItem>
                        {villages.map(village => (
                          <MenuItem key={village.id} value={village.name}>{village.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      onClick={clearFilters}
                      size="small"
                    >
                      Clear Location Filters
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('GROUPS.SELECT_USERS')}
                </Typography>
                <TextField
                  fullWidth
                  placeholder={t('LEARNERS.SEARCHBAR_PLACEHOLDER')}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                {/* Select/Deselect Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSelectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleDeselectAll}
                  >
                    Deselect All
                  </Button>
                </Box>

                <Paper variant="outlined" sx={{ maxHeight: 520, overflow: 'auto' }}>
                  {isLoadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : response?.result?.getUserDetails && response.result.getUserDetails.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                indeterminate={
                                  selectedUsers.length > 0 &&
                                  selectedUsers.length < response.result.getUserDetails.length
                                }
                                checked={
                                  response.result.getUserDetails.length > 0 &&
                                  selectedUsers.length === response.result.getUserDetails.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleSelectAll();
                                  } else {
                                    handleDeselectAll();
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>Learner Name</TableCell>
                            <TableCell>Username</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {response.result.getUserDetails.map((user: User) => (
                            <TableRow key={user.userId} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedUsers.includes(user.userId)}
                                  onChange={() => handleUserToggle(user.userId)}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {getFullName(user)}
                                    </Typography>
                                   
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <BadgeIcon fontSize="small" color="action" />
                                  <Typography variant="body2">{user.username || 'N/A'}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {user.mobile ? (
                                    <>
                                      <PhoneIcon fontSize="small" color="action" />
                                      <Typography variant="body2">{user.mobile}</Typography>
                                    </>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      N/A
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={user.status || 'Active'}
                                  size="small"
                                  color={getStatusColor(user.status) as 'success' | 'default'}
                                  variant={(user.status || '').toLowerCase() === 'archived' ? 'outlined' : 'filled'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <Typography color="text.secondary">
                        {t('LEARNERS.NO_LEARNERS_FOUND')}
                      </Typography>
                    </Box>
                  )}
                </Paper>

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
                        {Math.min((currentPage + 1) * pageLimit, totalCount)} of {totalCount}
                      </Typography>
                    </Box>

                    <Pagination
                      count={Math.max(1, Math.ceil((totalCount || 0) / pageLimit))}
                      page={currentPage + 1}
                      onChange={(_, page) => {
                        const searchData = buildSearchData(searchTerm);
                        loadUsers(searchData, page - 1);
                      }}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </Grid>
              
              {selectedUsers.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Users:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedUserNames.map((name: string, index: number) => (
                      <Chip key={index} label={name} size="small" />
                    ))}
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  disabled={loading || !selectedGroup || selectedUsers.length === 0}
                  sx={{ minWidth: 150 }}
                >
                  {loading ? t('COMMON.LOADING') : t('GROUPS.ADD_USERS_TO_GROUPS')}
                </Button>
              </Grid>
            </Grid>
          </form>
          
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {t('GROUPS.USERS_ADDED_TO_GROUP_SUCCESSFULLY')}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
    </Box>
  );
};

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default AddUsersToGroups;

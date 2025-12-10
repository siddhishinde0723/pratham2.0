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
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { userList, userHierarchicalSearch } from '@/services/UserList';
import { searchListData } from '@/components/DynamicForm/DynamicFormCallback';
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
  status: string;
  customFields?: Record<string, any>[];
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
  const [pageLimit] = useState<number>(100);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [response, setResponse] = useState<{ result?: { getUserDetails?: User[] } }>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Location filter states - storing IDs
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    block: '',
    village: '',
  });
  
  // Location field IDs for customFields
  const LOCATION_FIELD_IDS = {
    state: '800265b1-9058-482a-94f4-726197e1dfe4',
    district: '62340eaa-40fb-48b9-ba90-dcaa78be778e',
    block: '1e3e76e2-7f77-4fd7-a79f-abe5c33d4d08',
    village: '2f7e6930-0bc2-4e69-8bd4-dde205fa5471',
  };
  
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

  useEffect(() => {
    loadGroups();
    loadStates();
  }, []);
  
  // Load users when filters change
  useEffect(() => {
    loadUsers();
  }, [filters, searchTerm]);

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

  // Check if any location filters are active
  const hasLocationFilters = (): boolean => {
    return !!(filters.state || filters.district || filters.block || filters.village);
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
  const loadUsers = async (searchDataParam: Record<string, any> = {}) => {
    setIsLoadingUsers(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      const staticSort = ['firstName', 'asc'];

      // Get search term from searchDataParam or searchTerm state
      const searchTermValue = searchDataParam.firstName || searchDataParam.username || searchTerm || '';

      // Check if location filters are present
      const hasLocation = hasLocationFilters();

      if (hasLocation) {
        // Use hierarchical search API for location-based filtering
        const locationFilters = buildLocationFilters();
        
        const hierarchicalData = {
          limit: pageLimit,
          offset: 0,
          filters: locationFilters,
          role: ['Learner'],
          customfields: ['state', 'district', 'block', 'village', 'dob'],
          sort: ['name', 'asc'],
        };

        console.log('Add Users to Groups: Using hierarchical search with location filters:', hierarchicalData);

        const resp = await userHierarchicalSearch(hierarchicalData);
        
        // If search term is provided, filter results client-side
        let filteredUsers = resp?.getUserDetails || [];
        if (searchTermValue) {
          filteredUsers = filteredUsers.filter((user: User) => {
            const firstNameMatch = user.firstName?.toLowerCase().includes(searchTermValue.toLowerCase());
            const usernameMatch = user.username?.toLowerCase().includes(searchTermValue.toLowerCase());
            return firstNameMatch || usernameMatch;
          });
        }

        const filteredResult = {
          ...resp,
          getUserDetails: filteredUsers,
          totalCount: filteredUsers.length,
        };

        console.log('Add Users to Groups: Hierarchical search results:', {
          totalCount: filteredResult.totalCount,
          usersFound: filteredUsers.length,
        });

        setPageOffset(0);
        setCurrentPage(0);
        setResponse({ result: filteredResult });
      } else {
        // No location filters - use regular search API with sequential firstName/username search
        const staticFilter = {
          role: 'Learner',
          tenantId: tenantId,
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
            offset: 0,
            sort: staticSort,
            filters: filtersFirstName,
          };

          console.log('Add Users to Groups: Searching by firstName:', filtersFirstName);

          const respFirstName = await userList(dataFirstName);
          const totalCountFirstName = respFirstName?.totalCount || 0;
          const userDetailsFirstName = respFirstName?.getUserDetails || [];

          console.log('Add Users to Groups: firstName search results:', {
            totalCount: totalCountFirstName,
            usersFound: userDetailsFirstName.length,
          });

          // If results found with firstName, use those results
          if (totalCountFirstName > 0 && userDetailsFirstName.length > 0) {
            setPageOffset(0);
            setCurrentPage(0);
            setResponse({ result: respFirstName });
            setIsLoadingUsers(false);
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
            offset: 0,
            sort: staticSort,
            filters: filtersUsername,
          };

          const respUsername = await userList(dataUsername);
          console.log('Add Users to Groups: username search results:', {
            totalCount: respUsername?.totalCount || 0,
            usersFound: (respUsername?.getUserDetails || []).length,
          });

          setPageOffset(0);
          setCurrentPage(0);
          setResponse({ result: respUsername });
        } else {
          // No search term, load all learners
          const data = {
            limit: pageLimit,
            offset: 0,
            sort: staticSort,
            filters: staticFilter,
          };

          console.log('Add Users to Groups: Loading all users:', data);

          const resp = await userList(data);
          setPageOffset(0);
          setCurrentPage(0);
          setResponse({ result: resp });
        }
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
    const searchData = searchTermValue ? { firstName: searchTermValue } : {};
    loadUsers(searchData);
  }, 500);

  const handleGroupChange = (event: any) => {
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
    debouncedSearch(value);
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

                <Paper variant="outlined" sx={{ maxHeight: 500, overflow: 'auto' }}>
                  {isLoadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : response?.result?.getUserDetails && response.result.getUserDetails.length > 0 ? (
                    <List>
                      {response.result.getUserDetails.map((user: User) => (
                        <ListItem key={user.userId} sx={{ py: 1 }}>
                          <ListItemIcon>
                            <Checkbox
                              checked={selectedUsers.includes(user.userId)}
                              onChange={() => handleUserToggle(user.userId)}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim()}
                            secondary={user.email}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <Typography color="text.secondary">
                        {t('LEARNERS.NO_LEARNERS_FOUND')}
                      </Typography>
                    </Box>
                  )}
                </Paper>
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

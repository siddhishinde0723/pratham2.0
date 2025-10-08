import React, { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
// import { useTranslation } from 'next-i18next';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Button,
  Grid,
  SelectChangeEvent,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Description as ContentIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { getGroups, GroupDetails, getGroupUsers, GroupUser, archiveUserFromGroup, getGroupContent, GroupContent, archiveContentFromGroup, activateContentInGroup } from '../services/GroupService';
import LocationService from '../services/LocationService';

// Using interfaces from GroupService

const GroupsOverview: React.FC = () => {
  const [groups, setGroups] = useState<GroupDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | false>(false);
  const [groupUsers, setGroupUsers] = useState<{ [groupId: string]: GroupUser[] }>({});
  const [loadingUsers, setLoadingUsers] = useState<{ [groupId: string]: boolean }>({});
  const [loadingUserCounts, setLoadingUserCounts] = useState(false);
  const [archivingUsers, setArchivingUsers] = useState<{ [userId: string]: boolean }>({});
  
  // Content-related states
  const [groupContent, setGroupContent] = useState<{ [groupId: string]: GroupContent[] }>({});
  const [contentCounts, setContentCounts] = useState<{ [groupId: string]: number }>({});
  const [loadingContent, setLoadingContent] = useState<{ [groupId: string]: boolean }>({});
  const [archivingContent, setArchivingContent] = useState<{ [contentId: string]: boolean }>({});
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    state: '',
    district: '',
    block: '',
    village: '',
    status: ''
  });
  // const [sortBy, setSortBy] = useState('name');
  // const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
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

  // Load initial data
  useEffect(() => {
    console.log('useEffect triggered - filters changed:', filters);
    loadGroupsData();
    loadStates();
  }, [page, rowsPerPage, filters, searchTerm]);

  // Debug: Log states when they change
  useEffect(() => {
    console.log('States updated:', states);
  }, [states]);

  // Debug: Log districts when they change
  useEffect(() => {
    console.log('Districts updated:', districts);
  }, [districts]);

  // Debug: Log blocks when they change
  useEffect(() => {
    console.log('Blocks updated:', blocks);
  }, [blocks]);

  // Debug: Log villages when they change
  useEffect(() => {
    console.log('Villages updated:', villages);
  }, [villages]);

  const loadGroupsData = async () => {
    setLoading(true);
    setError('');
    
    console.log('loadGroupsData called with filters:', {
      state: filters.state,
      district: filters.district,
      block: filters.block,
      village: filters.village,
      status: filters.status,
      name: searchTerm
    });
    console.log('Status filter value:', filters.status);
    console.log('Status filter type:', typeof filters.status);
    
    try {
      // Load groups using the GroupService with pagination
      const groupsResult = await getGroups({ 
        limit: rowsPerPage, 
        offset: page * rowsPerPage,
        filters: {
          state: filters.state || undefined,
          district: filters.district || undefined,
          block: filters.block || undefined,
          village: filters.village || undefined,
          status: filters.status ? [filters.status] : undefined,
          name: searchTerm || undefined
        }
      });
      console.log('Groups loaded:', groupsResult);
      
      // Transform groups to include location details from the API response
      const enrichedGroups: GroupDetails[] = groupsResult.groups.map((group) => ({
        ...group,
        users: [], // TODO: Load users from API
        content: [], // TODO: Load content from API
        locationDetails: {
          state: { id: group.state, name: group.state },
          district: { id: group.district, name: group.district },
          block: { id: group.block, name: group.block },
          village: { id: group.village, name: group.village }
        }
      }));

      setGroups(enrichedGroups);
      setTotalCount(groupsResult.count);
      
      // Fetch user counts for all groups
      await fetchUserCountsForAllGroups(enrichedGroups);
      
      // Fetch content for all groups
      await fetchContentForAllGroups(enrichedGroups);
    } catch (error: unknown) {
      console.error('Failed to load groups data:', error);
      
      // Handle specific API error cases
      const apiError = error as { response?: { data?: { params?: { status?: string; err?: string } }; status?: number } };
      if (apiError?.response?.data?.params?.status === 'failed' && 
          apiError?.response?.data?.params?.err === 'NOT FOUND') {
        // No groups found - this is not an error, just empty result
        setGroups([]);
        setTotalCount(0);
        setError(''); // Clear any previous errors
      } else if (apiError?.response?.status === 404) {
        // 404 Not Found - no groups available
        setGroups([]);
        setTotalCount(0);
        setError('');
      } else {
        // Other errors
        setError('Failed to load groups data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    console.log('Accordion change:', { panel, isExpanded, hasUsers: !!groupUsers[panel], hasContent: !!groupContent[panel] });
    setExpandedGroup(isExpanded ? panel : false);
    
    // Users and content should already be loaded from the initial page load
    // Only fetch if somehow they're missing (fallback)
    if (isExpanded && !groupUsers[panel]) {
      console.log('Users missing for panel, fetching as fallback:', panel);
      fetchGroupUsers(panel);
    } else if (isExpanded && groupUsers[panel]) {
      console.log('Users already loaded for panel:', panel);
    }
    
    if (isExpanded && !groupContent[panel]) {
      console.log('Content missing for panel, fetching as fallback:', panel);
      fetchGroupContent(panel);
    } else if (isExpanded && groupContent[panel]) {
      console.log('Content already loaded for panel:', panel);
    }
  };

  const fetchUserCountsForAllGroups = async (groups: GroupDetails[]) => {
    console.log('Fetching user counts for all groups:', groups.length);
    setLoadingUserCounts(true);
    
    // Create promises for all groups to fetch user counts in parallel
    const userCountPromises = groups.map(async (group) => {
      try {
        console.log('Fetching user count for group:', group.id);
        const users = await getGroupUsers(group.id);
        return { groupId: group.id, userCount: users.length, users: users };
      } catch (error) {
        console.error(`Error fetching users for group ${group.id}:`, error);
        return { groupId: group.id, userCount: 0, users: [] };
      }
    });
    
    try {
      // Wait for all user count requests to complete
      const results = await Promise.all(userCountPromises);
      console.log('All user counts fetched:', results);
      
      // Update the groupUsers state with all the results
      const newGroupUsers: { [groupId: string]: GroupUser[] } = {};
      results.forEach(result => {
        newGroupUsers[result.groupId] = result.users;
      });
      
      setGroupUsers(prev => ({ ...prev, ...newGroupUsers }));
      console.log('Updated groupUsers state with all user counts');
    } catch (error) {
      console.error('Error fetching user counts for groups:', error);
    } finally {
      setLoadingUserCounts(false);
    }
  };

  const fetchContentForAllGroups = async (groups: GroupDetails[]) => {
    console.log('Fetching content for all groups:', groups.length);
    setLoadingContent(prev => {
      const newState = { ...prev };
      groups.forEach(group => {
        newState[group.id] = true;
      });
      return newState;
    });
    
    // Create promises for all groups to fetch content in parallel
      const contentPromises = groups.map(async (group) => {
        try {
          console.log('Fetching content for group:', group.id);
          const contentResponse = await getGroupContent(group.id);
          return { groupId: group.id, content: contentResponse.content, totalCount: contentResponse.totalCount };
        } catch (error) {
          console.error(`Error fetching content for group ${group.id}:`, error);
          // Return empty content for failed requests - this is normal for groups without content
          return { groupId: group.id, content: [], totalCount: 0 };
        }
      });

    try {
      const results = await Promise.all(contentPromises);
      console.log('Content results:', results);
      
      // Update state with content data
      const newGroupContent: { [groupId: string]: GroupContent[] } = {};
      const newContentCounts: { [groupId: string]: number } = {};
      
      results.forEach(({ groupId, content, totalCount }) => {
        newGroupContent[groupId] = content;
        newContentCounts[groupId] = totalCount;
      });
      
      setGroupContent(newGroupContent);
      setContentCounts(newContentCounts);
      console.log('Updated groupContent state:', newGroupContent);
      console.log('Updated contentCounts state:', newContentCounts);
    } catch (error) {
      console.error('Error fetching content:', error);
      // Don't set error state for content fetching failures - this is normal for groups without content
      console.log('Some groups may not have content yet - this is normal');
    } finally {
      setLoadingContent(prev => {
        const newState = { ...prev };
        groups.forEach(group => {
          newState[group.id] = false;
        });
        return newState;
      });
    }
  };

  const fetchGroupUsers = async (groupId: string) => {
    console.log('fetchGroupUsers called with groupId:', groupId);
    setLoadingUsers(prev => ({ ...prev, [groupId]: true }));
    
    try {
      console.log('About to call getGroupUsers API for group:', groupId);
      const users = await getGroupUsers(groupId);
      console.log('Successfully fetched users:', users);
      console.log('Number of users fetched:', users.length);
      
      setGroupUsers(prev => ({ ...prev, [groupId]: users }));
      console.log('Updated groupUsers state for group:', groupId);
    } catch (error) {
      console.error('Error fetching group users:', error);
      console.error('Error details:', error);
      setError('Failed to load users for this group');
    } finally {
      setLoadingUsers(prev => ({ ...prev, [groupId]: false }));
      console.log('Finished loading users for group:', groupId);
    }
  };

  const fetchGroupContent = async (groupId: string) => {
    console.log('fetchGroupContent called with groupId:', groupId);
    setLoadingContent(prev => ({ ...prev, [groupId]: true }));
    
    try {
      console.log('About to call getGroupContent API for group:', groupId);
      const contentResponse = await getGroupContent(groupId);
      console.log('Successfully fetched content:', contentResponse);
      console.log('Number of content items fetched:', contentResponse.content.length);
      
      setGroupContent(prev => ({ ...prev, [groupId]: contentResponse.content }));
      setContentCounts(prev => ({ ...prev, [groupId]: contentResponse.totalCount }));
      console.log('Updated groupContent state for group:', groupId);
    } catch (error) {
      console.error('Error fetching group content:', error);
      console.error('Error details:', error);
      setError('Failed to load content for this group');
    } finally {
      setLoadingContent(prev => ({ ...prev, [groupId]: false }));
      console.log('Finished loading content for group:', groupId);
    }
  };

  const handleArchiveUser = async (user: GroupUser, groupId: string) => {
    if (!user.cohortMembershipId) {
      console.error('No cohortMembershipId found for user:', user);
      setError('Cannot archive user: Missing membership ID');
      return;
    }

    console.log('Archiving user:', user.firstName, user.lastName, 'from group:', groupId);
    setArchivingUsers(prev => ({ ...prev, [user.id]: true }));
    
    try {
      await archiveUserFromGroup(user.cohortMembershipId);
      console.log('User archived successfully');
      
      // Refresh the user list for this group
      await fetchGroupUsers(groupId);
      
      // Show success message
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error('Error archiving user:', error);
      setError(`Failed to archive user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setArchivingUsers(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const handleArchiveContent = async (content: GroupContent, groupId: string) => {
    console.log('Archiving content:', content.contentName, 'from group:', groupId);
    setArchivingContent(prev => ({ ...prev, [content.contentId]: true }));

    try {
      await archiveContentFromGroup(groupId, content.contentId);
      console.log('Content archived successfully');
      
      // Update content status to archived
      setGroupContent(prev => ({
        ...prev,
        [groupId]: prev[groupId]?.map(c => 
          c.contentId === content.contentId 
            ? { ...c, status: 'archive' as const }
            : c
        ) || []
      }));
      
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error('Error archiving content:', error);
      setError('Failed to archive content. Please try again.');
    } finally {
      setArchivingContent(prev => ({ ...prev, [content.contentId]: false }));
    }
  };

  const handleActivateContent = async (content: GroupContent, groupId: string) => {
    console.log('Activating content:', content.contentName, 'in group:', groupId);
    setArchivingContent(prev => ({ ...prev, [content.contentId]: true }));

    try {
      await activateContentInGroup(groupId, content.contentId);
      console.log('Content activated successfully');
      
      // Update content status to active
      setGroupContent(prev => ({
        ...prev,
        [groupId]: prev[groupId]?.map(c => 
          c.contentId === content.contentId 
            ? { ...c, status: 'active' as const }
            : c
        ) || []
      }));
      
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error('Error activating content:', error);
      setError('Failed to activate content. Please try again.');
    } finally {
      setArchivingContent(prev => ({ ...prev, [content.contentId]: false }));
    }
  };

  const handleFilterChange = (field: string) => (event: SelectChangeEvent<string>) => {
    const value = event.target.value as string;
    console.log(`Filter change: ${field} = ${value}`);
    
    // Handle cascading location filters
    if (field === 'state') {
      console.log('State changed, clearing dependent data');
      // Clear dependent filters and data when state changes
      setFilters(prev => ({
        ...prev,
        [field]: value,
        district: '',
        block: '',
        village: ''
      }));
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      
      // Load districts for selected state
      if (value) {
        const selectedState = states.find(s => s.name === value);
        console.log('Selected state:', selectedState);
        if (selectedState) {
          loadDistricts(selectedState.id);
        }
      }
    } else if (field === 'district') {
      console.log('District changed, clearing dependent data');
      // Clear dependent filters and data when district changes
      setFilters(prev => ({
        ...prev,
        [field]: value,
        block: '',
        village: ''
      }));
      setBlocks([]);
      setVillages([]);
      
      // Load blocks for selected district
      if (value) {
        const selectedDistrict = districts.find(d => d.name === value);
        console.log('Selected district:', selectedDistrict);
        if (selectedDistrict) {
          loadBlocks(selectedDistrict.id);
        }
      }
    } else if (field === 'block') {
      console.log('Block changed, clearing dependent data');
      // Clear dependent filters and data when block changes
      setFilters(prev => ({
        ...prev,
        [field]: value,
        village: ''
      }));
      setVillages([]);
      
      // Load villages for selected block
      if (value) {
        const selectedBlock = blocks.find(b => b.name === value);
        console.log('Selected block:', selectedBlock);
        if (selectedBlock) {
          loadVillages(selectedBlock.id);
        }
      }
    } else {
      // For other fields (status, search), just update the filter
      setFilters(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    setPage(0); // Reset to first page when filter changes
  };

  // Sort functionality (currently not used in UI)
  // const handleSortChange = (field: string) => {
  //   if (sortBy === field) {
  //     setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortBy(field);
  //     setSortOrder('asc');
  //   }
  // };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      state: '',
      district: '',
      block: '',
      village: '',
      status: ''
    });
    setSearchTerm('');
    setPage(0);
    setDistricts([]);
    setBlocks([]);
    setVillages([]);
  };


  // Server-side filtering is now handled in loadGroupsData

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading groups data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon />
        Groups Overview
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search & Filters
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search groups by name, description, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            {/* <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="createdAt">Created Date</MenuItem>
                  <MenuItem value="state">State</MenuItem>
                  <MenuItem value="district">District</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                size="small"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </Box> */}
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>State</InputLabel>
              <Select
                value={filters.state}
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
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>District</InputLabel>
              <Select
                value={filters.district}
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
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Block</InputLabel>
              <Select
                value={filters.block}
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
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Village</InputLabel>
              <Select
                value={filters.village}
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
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={handleFilterChange('status')}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              size="small"
            >
              Clear Filters
            </Button>
          </Grid>
          
        </Grid>
      </Paper>

      {/* Groups List */}
      {groups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || filters.state || filters.district || filters.block || filters.village || filters.status
              ? 'No groups found matching your search criteria.'
              : 'No groups available.'}
          </Typography>
          {(searchTerm || filters.state || filters.district || filters.block || filters.village || filters.status) && (
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search filters or clear all filters to see all groups.
            </Typography>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map((group) => (
            <Accordion
              key={group.id}
              expanded={expandedGroup === group.id}
              onChange={handleAccordionChange(group.id)}
              sx={{ boxShadow: 2 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ backgroundColor: '#f5f5f5', color: 'black' }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <GroupIcon />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{group.name}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {group.description}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                      📍 {group.locationDetails.state.name} → {group.locationDetails.district.name} → {group.locationDetails.block.name} → {group.locationDetails.village.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={group.status}
                      color={group.status === 'Active' ? 'success' : 'default'}
                      size="small"
                    />
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      {loadingUserCounts ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CircularProgress size={12} />
                          Loading users...
                        </Box>
                      ) : (
                        `${groupUsers[group.id]?.length || 0} users • ${contentCounts[group.id] || 0} content`
                      )}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 3, backgroundColor: '#fafafa' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Users Section */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <PersonIcon />
                      Users ({groupUsers[group.id]?.length || 0})
                    </Typography>
                    {loadingUsers[group.id] ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">
                          Loading users...
                        </Typography>
                      </Box>
                    ) : (() => {
                      const users = groupUsers[group.id];
                      return users && users.length > 0;
                    })() ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {groupUsers[group.id]?.map((user) => (
                          <Paper
                            key={user.id}
                            sx={{ 
                              p: 2, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 2,
                              backgroundColor: user.status === 'Active' ? '#f8f9fa' : '#f5f5f5'
                            }}
                          >
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {user.firstName} {user.lastName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Role: {user.role} 
                              </Typography>
                           
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={user.status}
                                color={user.status === 'Active' ? 'success' : 'default'}
                                size="small"
                              />
                              {user.status === 'Active' && (
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  disabled={archivingUsers[user.id]}
                                  onClick={() => handleArchiveUser(user, group.id)}
                                  sx={{ minWidth: 'auto', px: 1 }}
                                >
                                  {archivingUsers[user.id] ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    'Archive'
                                  )}
                                </Button>
                              )}
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No users assigned to this group.
                      </Typography>
                    )}
                  </Box>

                  {/* Content Section */}
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ContentIcon />
                      Content ({contentCounts[group.id] || 0})
                    </Typography>
                    {loadingContent[group.id] ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">
                          Loading content...
                        </Typography>
                      </Box>
                    ) : (() => {
                      const content = groupContent[group.id];
                      return content && content.length > 0;
                    })() ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {groupContent[group.id]?.map((content) => (
                          <Paper
                            key={content.contentId}
                            sx={{ 
                              p: 2, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 2,
                              backgroundColor: '#f8f9fa'
                            }}
                          >
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {content.contentName}
                              </Typography>
                             
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={content.status === 'active' ? 'Active' : 'Archived'}
                                color={content.status === 'active' ? 'success' : 'default'}
                                size="small"
                                variant="outlined"
                              />
                              {content.status === 'active' ? (
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  disabled={archivingContent[content.contentId]}
                                  onClick={() => handleArchiveContent(content, group.id)}
                                  sx={{ minWidth: 'auto', px: 1 }}
                                >
                                  {archivingContent[content.contentId] ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    'Archive'
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="outlined"
                                  color="success"
                                  size="small"
                                  disabled={archivingContent[content.contentId]}
                                  onClick={() => handleActivateContent(content, group.id)}
                                  sx={{ minWidth: 'auto', px: 1 }}
                                >
                                  {archivingContent[content.contentId] ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    'Activate'
                                  )}
                                </Button>
                              )}
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No content assigned to this group.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {groups.length > 0 && (
        <Paper sx={{ mt: 3 }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Rows per page:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
            }
          />
        </Paper>
      )}
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

export default GroupsOverview;

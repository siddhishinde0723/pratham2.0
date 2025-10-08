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
import { userList } from '@/services/UserList';
import { searchListData } from '@/components/DynamicForm/DynamicFormCallback';
import { debounce } from 'lodash';
import { searchGroups, addUserToGroup } from '../services/GroupService';

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

  useEffect(() => {
    loadGroups();
    loadUsers();
  }, []);

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

  // Load users
  const loadUsers = async (searchData: Record<string, any> = {}) => {
    setIsLoadingUsers(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      const staticFilter = {
        role: 'Learner',
        tenantId: tenantId,
      };
      const staticSort = ['firstName', 'asc'];

      await searchListData(
        searchData,
        0,
        staticFilter,
        pageLimit,
        setPageOffset,
        setCurrentPage,
        setResponse,
        userList,
        staticSort
      );
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Debounced search
  const debouncedSearch = debounce((searchTerm: string) => {
    const searchData = searchTerm ? { firstName: searchTerm } : {};
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

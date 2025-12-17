import React, { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon 
  ,    CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import LocationService from '../services/LocationService';
import { createGroup, searchGroups, updateGroup } from '../services/GroupService';
import TenantService from '../services/TenantService';
interface Location {
  id: string;
  name: string;
}

interface SelectedLocationData {
  state: {
    id: string;
    name: string;
  };
  district: {
    id: string;
    name: string;
  };
  block: {
    id: string;
    name: string;
  };
  village: {
    id: string;
    name: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  state: string;
  district: string;
  block: string;
  village: string;
  createdAt: string;
  status: string;
}

const CreateGroups: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    groupName: '',
    state: '',
    district: '',
    block: '',
    village: '',
    academicYear: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  // Location data states
  const [states, setStates] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [blocks, setBlocks] = useState<Location[]>([]);
  const [villages, setVillages] = useState<Location[]>([]);
  
  // Loading states for location data
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  
  // Groups list state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: '',
    groupId: '',
  });
  
  // Selected location data state
  const [selectedLocationData, setSelectedLocationData] = useState<SelectedLocationData>({
    state: { id: '', name: '' },
    district: { id: '', name: '' },
    block: { id: '', name: '' },
    village: { id: '', name: '' }
  });

  // Load initial data
  useEffect(() => {
    loadStates();
    loadExistingGroups();
    
    // Load academic year ID from localStorage if available
    const storedAcademicYear = localStorage.getItem('academicYearId');
    if (storedAcademicYear) {
      setFormData(prev => ({
        ...prev,
        academicYear: storedAcademicYear
      }));
      console.log('Loaded academic year ID from localStorage:', storedAcademicYear);
    }
  }, []);

  const loadStates = async () => {
    setLoadingStates(true);
    try {
      console.log('Loading states...');
      const statesData = await LocationService.getStates();
      console.log('States data received:', statesData);
      
      if (statesData && statesData.length > 0) {
        setStates(statesData);
      } else {
        console.warn('No states data received, using fallback data');
        // Fallback data for testing
        setStates([
          { id: '1', name: 'Maharashtra' },
          { id: '2', name: 'Karnataka' },
          { id: '3', name: 'Tamil Nadu' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load states:', error);
      setError('Failed to load states. Please try again.');
      // Fallback data for testing
      setStates([
        { id: '1', name: 'Maharashtra' },
        { id: '2', name: 'Karnataka' },
        { id: '3', name: 'Tamil Nadu' },
      ]);
    } finally {
      setLoadingStates(false);
    }
  };

  const loadExistingGroups = async () => {
    setLoadingGroups(true);
    try {
      console.log('Loading existing groups...');
      const result = await searchGroups({
        limit: 50,
        offset: 0,
        filters: {
          type: 'ADHOC-Group'
        }
      });
      
      console.log('Groups loaded:', result.groups);
      setGroups(result.groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setError('Failed to load existing groups. Please try again.');
      // Fallback to empty array
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleLocationChange = (field: string) => async (event: SelectChangeEvent<string>) => {
    const value = event.target.value as string;
    setFormData({
      ...formData,
      [field]: value,
    });

    // Reset dependent dropdowns when parent changes
    if (field === 'state') {
      const selectedState = states.find(state => state.id === value);
      setFormData(prev => ({
        ...prev,
        state: value,
        district: '',
        block: '',
        village: '',
      }));
      setDistricts([]);
      setBlocks([]);
      setVillages([]);
      
      // Update selected location data
      setSelectedLocationData(prev => ({
        ...prev,
        state: selectedState ? { id: selectedState.id, name: selectedState.name } : { id: '', name: '' },
        district: { id: '', name: '' },
        block: { id: '', name: '' },
        village: { id: '', name: '' }
      }));
      
      // Load districts based on selected state
      if (value) {
        setLoadingDistricts(true);
        try {
          const districtsData = await LocationService.getDistricts(value);
          setDistricts(districtsData);
        } catch (error) {
          console.error('Failed to load districts:', error);
          setError('Failed to load districts. Please try again.');
        } finally {
          setLoadingDistricts(false);
        }
      }
    } else if (field === 'district') {
      const selectedDistrict = districts.find(district => district.id === value);
      setFormData(prev => ({
        ...prev,
        district: value,
        block: '',
        village: '',
      }));
      setBlocks([]);
      setVillages([]);
      
      // Update selected location data
      setSelectedLocationData(prev => ({
        ...prev,
        district: selectedDistrict ? { id: selectedDistrict.id, name: selectedDistrict.name } : { id: '', name: '' },
        block: { id: '', name: '' },
        village: { id: '', name: '' }
      }));
      
      // Load blocks based on selected district
      if (value) {
        setLoadingBlocks(true);
        try {
          const blocksData = await LocationService.getBlocks(value);
          setBlocks(blocksData);
        } catch (error) {
          console.error('Failed to load blocks:', error);
          setError('Failed to load blocks. Please try again.');
        } finally {
          setLoadingBlocks(false);
        }
      }
    } else if (field === 'block') {
      const selectedBlock = blocks.find(block => block.id === value);
      setFormData(prev => ({
        ...prev,
        block: value,
        village: '',
      }));
      setVillages([]);
      
      // Update selected location data
      setSelectedLocationData(prev => ({
        ...prev,
        block: selectedBlock ? { id: selectedBlock.id, name: selectedBlock.name } : { id: '', name: '' },
        village: { id: '', name: '' }
      }));
      
      // Load villages based on selected block
      if (value) {
        setLoadingVillages(true);
        try {
          const villagesData = await LocationService.getVillages(value);
          setVillages(villagesData);
        } catch (error) {
          console.error('Failed to load villages:', error);
          setError('Failed to load villages. Please try again.');
        } finally {
          setLoadingVillages(false);
        }
      }
    } else if (field === 'village') {
      const selectedVillage = villages.find(village => village.id === value);
      setFormData(prev => ({
        ...prev,
        village: value,
      }));
      
      // Update selected location data
      setSelectedLocationData(prev => ({
        ...prev,
        village: selectedVillage ? { id: selectedVillage.id, name: selectedVillage.name } : { id: '', name: '' }
      }));
      
      // Log the complete selected location data when village is selected
      console.log('Complete Selected Location Data:', {
        ...selectedLocationData,
        village: selectedVillage ? { id: selectedVillage.id, name: selectedVillage.name } : { id: '', name: '' }
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (editingGroup) {
        // TODO: Implement update group API call
        // For now, just update local state
        setGroups(prev => prev.map(group => 
          group.id === editingGroup.id 
            ? { ...group, ...formData, name: formData.groupName }
            : group
        ));
        setEditingGroup(null);
        setSuccess(true);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        // Create new group using the API
        const userId = localStorage.getItem('userId');
        console.log('Using user ID:', userId);
        
        const groupData = {
          name: formData.groupName,
          type: "ADHOC-Group",
          status: "active",
          params: {
            groupOwnerId: userId || "userId"
          },
          customFields: [
            {
              // State field ID - from the curl request
              fieldId: "800265b1-9058-482a-94f4-726197e1dfe4",
              value: [selectedLocationData.state.id]
            },
            {
              // District field ID - from the curl request
              fieldId: "62340eaa-40fb-48b9-ba90-dcaa78be778e",
              value: [selectedLocationData.district.id]
            },
            {
              // Block field ID - from the curl request
              fieldId: "1e3e76e2-7f77-4fd7-a79f-abe5c33d4d08",
              value: [selectedLocationData.block.id]
            },
            {
              // Village field ID - from the curl request
              fieldId: "2f7e6930-0bc2-4e69-8bd4-dde205fa5471",
              value: [selectedLocationData.village.id]
            }
          ]
        };

        const response = await createGroup(groupData);
        console.log('Group created successfully:', response);
        
        // Store academic year ID from tenant config in localStorage
        try {
          const tenantConfig = await TenantService.getTenantConfig();
          if (tenantConfig?.academicYearId) {
            localStorage.setItem('academicYearId', tenantConfig.academicYearId);
            console.log('Academic Year ID set from tenant config:', tenantConfig.academicYearId);
          }
        } catch (error) {
          console.error('Error fetching tenant config for academicYearId:', error);
        }

        
        // Refresh the groups list to show the new group
        await loadExistingGroups();
        setSuccess(true);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      }
      
      // Reset form
      setFormData({
        groupName: '',
        state: '',
        district: '',
        block: '',
        village: '',
        academicYear: '',
      });
      
      // Reset selected location data
      setSelectedLocationData({
        state: { id: '', name: '' },
        district: { id: '', name: '' },
        block: { id: '', name: '' },
        village: { id: '', name: '' }
      });
    } catch (error: unknown) {
      console.error('Failed to save group:', error);
      
      // Extract error message from API response
      let errorMessage = 'Failed to save group. Please try again.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      groupName: group.name,
      state: group.state,
      district: group.district,
      block: group.block,
      village: group.village,
      academicYear: '',
    });
  };

  const handleDelete = (groupId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This action will archive the group.',
      action: 'delete',
      groupId: groupId,
    });
  };

  const handleRestore = (groupId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Restore Group',
      message: 'Are you sure you want to restore this group? This action will make the group active again.',
      action: 'restore',
      groupId: groupId,
    });
  };

  const handleConfirmAction = async () => {
    const { action, groupId } = confirmDialog;
    
    try {
      setLoadingGroups(true);
      setConfirmDialog(prev => ({ ...prev, open: false }));
      
      if (action === 'delete') {
        console.log('Deleting group:', groupId);
        await updateGroup(groupId, { status: 'Archived' });
        setGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { ...group, status: 'Archived' }
            : group
        ));
        console.log('Group successfully archived');
      } else if (action === 'restore') {
        console.log('Restoring group:', groupId);
        await updateGroup(groupId, { status: 'Active' });
        setGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { ...group, status: 'Active' }
            : group
        ));
        console.log('Group successfully restored');
      }
      
      setError(''); // Clear any previous errors
    } catch (error) {
      console.error(`Failed to ${action} group:`, error);
      setError(`Failed to ${action} group. Please try again.`);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setFormData({
      groupName: '',
      state: '',
      district: '',
      block: '',
      village: '',
      academicYear: '',
    });
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
  
    const getStatusText = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

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

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {editingGroup ? t('GROUPS.EDIT_GROUP') : t('GROUPS.CREATE_GROUPS')}
        </Typography>
        
        {/* Create/Edit Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('GROUPS.GROUP_NAME')}
                  value={formData.groupName}
                  onChange={handleInputChange('groupName')}
                  required
                  variant="outlined"
                />
              </Grid>

           

        
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('FORM.STATE')}</InputLabel>
                  <Select
                    value={formData.state}
                    onChange={handleLocationChange('state')}
                    label={t('FORM.STATE')}
                    disabled={loadingStates}
                  >
                    {loadingStates ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading states...
                      </MenuItem>
                    ) : (
                      states.map((state) => (
                        <MenuItem key={state.id} value={state.id}>
                          {state.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('FORM.DISTRICT')}</InputLabel>
                  <Select
                    value={formData.district}
                    onChange={handleLocationChange('district')}
                    label={t('FORM.DISTRICT')}
                    disabled={!formData.state || loadingDistricts}
                  >
                    {loadingDistricts ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading districts...
                      </MenuItem>
                    ) : (
                      districts.map((district) => (
                        <MenuItem key={district.id} value={district.id}>
                          {district.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('FORM.BLOCK')}</InputLabel>
                  <Select
                    value={formData.block}
                    onChange={handleLocationChange('block')}
                    label={t('FORM.BLOCK')}
                    disabled={!formData.district || loadingBlocks}
                  >
                    {loadingBlocks ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading blocks...
                      </MenuItem>
                    ) : (
                      blocks.map((block) => (
                        <MenuItem key={block.id} value={block.id}>
                          {block.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('FORM.VILLAGE')}</InputLabel>
                  <Select
                    value={formData.village}
                    onChange={handleLocationChange('village')}
                    label={t('FORM.VILLAGE')}
                    disabled={!formData.block || loadingVillages}
                  >
                    {loadingVillages ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading villages...
                      </MenuItem>
                    ) : (
                      villages.map((village) => (
                        <MenuItem key={village.id} value={village.id}>
                          {village.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    disabled={loading || !formData.groupName.trim() || !selectedLocationData.state.id || !selectedLocationData.district.id || !selectedLocationData.block.id || !selectedLocationData.village.id}
                    sx={{ minWidth: 150 }}
                  >
                    {loading ? t('COMMON.LOADING') : (editingGroup ? t('COMMON.UPDATE') : t('GROUPS.CREATE_GROUPS'))}
                  </Button>
                  {editingGroup && (
                    <Button
                      variant="outlined"
                      onClick={handleCancelEdit}
                      disabled={loading}
                    >
                      {t('COMMON.CANCEL')}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </form>
          
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {editingGroup ? 'Group updated successfully!' : 'Group created successfully!'}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>

        {/* Selected Location Data Display */}
        {selectedLocationData.village.id && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selected Location Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  State: {selectedLocationData.state.name} (ID: {selectedLocationData.state.id})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  District: {selectedLocationData.district.name} (ID: {selectedLocationData.district.id})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Block: {selectedLocationData.block.name} (ID: {selectedLocationData.block.id})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Village: {selectedLocationData.village.name} (ID: {selectedLocationData.village.id})
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Groups List */}
        <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Existing Groups
              </Typography>
              {loadingGroups ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ ml: 2 }}>Loading groups...</Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Group Name</TableCell>
                      
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell>{group.name}</TableCell>
                            <TableCell>
                                 <Chip
                                label={getStatusText(group.status)}
                                size="small"
                                color={getStatusColor(group.status) as any}
                                icon={
                                  getStatusIcon(group.status) || undefined
                                }
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{group.createdAt}</TableCell>
                            <TableCell>
                              {group.status === 'Active' ? (
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDelete(group.id)}
                                  color="error"
                                  disabled={loadingGroups}
                                  title="Delete Group"
                                >
                                  {loadingGroups ? <CircularProgress size={16} /> : <DeleteIcon />}
                                </IconButton>
                              ) : (
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleRestore(group.id)}
                                  color="success"
                                  disabled={loadingGroups}
                                  title="Restore Group"
                                >
                                  {loadingGroups ? <CircularProgress size={16} /> : <EditIcon />}
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {groups.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        No groups found. Create your first group above.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
        </Paper>
        
        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={handleCancelAction}
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <DialogTitle id="confirm-dialog-title">
            {confirmDialog.title}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="confirm-dialog-description">
              {confirmDialog.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelAction} color="primary">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction} 
              color={confirmDialog.action === 'delete' ? 'error' : 'success'}
              variant="contained"
              disabled={loadingGroups}
            >
              {loadingGroups ? (
                <CircularProgress size={20} />
              ) : (
                confirmDialog.action === 'delete' ? 'Delete' : 'Restore'
              )}
            </Button>
          </DialogActions>
        </Dialog>
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

export default CreateGroups;

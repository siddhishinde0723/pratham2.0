import React, { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { contentSearch, Content as ContentType } from '../services/ContentService';
import { searchListData } from '../components/DynamicForm/DynamicFormCallback';
import { searchGroups, addContentToGroup } from '../services/GroupService';

interface Group {
  id: string;
  name: string;
  description: string;
}

// Using ContentType from ContentService instead of local interface

const AddContentToGroups: React.FC = () => {
  const { t } = useTranslation();
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [content, setContent] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  // API-related states
  const [searchTerm, setSearchTerm] = useState('');
  const [pageLimit, setPageLimit] = useState<number>(50);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [response, setResponse] = useState<any>({});
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Load content from API
  const loadContent = async () => {
    console.log('Loading content...');
    
    // Ensure academic year ID is set (fallback mechanism)
    if (!localStorage.getItem('academicYearId')) {
      localStorage.setItem('academicYearId', 'edf1d200-21d8-417e-b844-1d04f92435f4');
      console.log('Academic Year ID set as fallback');
    }
    
    setIsLoadingContent(true);
    try {
      const staticFilter = {
        status: [
          'Live',
        ],
        primaryCategory: [
          'Content Playlist',
          'Course',
          'Digital Textbook',
          'Question paper',
          'Course Assessment',
          'eTextbook',
          'Explanation Content',
          'Learning Resource',
          'Practice Question Set',
          'Teacher Resource',
          'Exam Question'
        ],
      };

      const searchFilter = searchTerm
        ? {
            name: searchTerm,
          }
        : {};

      // Call searchListData with correct parameters
      console.log('Calling searchListData with:', { searchFilter, currentPage, staticFilter, pageLimit });
      await searchListData(
        searchFilter,           // formData
        currentPage,            // newPage
        staticFilter,           // staticFilter
        pageLimit,              // pageLimit
        setPageOffset,          // setPageOffset
        setCurrentPage,         // setCurrentPage
        setResponse,            // setResponse
        contentSearch,          // getListApiCall
        { lastUpdatedOn: 'desc' } // staticSort
      );
    } catch (error) {
      console.error('Error loading content:', error);
      setError('Failed to load content. Please try again.');
      
      // Fallback to mock content for testing
      const mockContent: ContentType[] = [
        {
          identifier: 'mock-1',
          name: 'Sample Math Course',
          primaryCategory: 'Course',
          duration: '2 hours',
          status: 'Live',
          contentType: 'Course',
          resourceType: 'Course',
          mimeType: 'application/vnd.ekstep.content-collection',
          channel: 'test-channel'
        },
        {
          identifier: 'mock-2',
          name: 'Science Learning Resource',
          primaryCategory: 'Learning Resource',
          duration: '1 hour',
          status: 'Live',
          contentType: 'Resource',
          resourceType: 'Learning Resource',
          mimeType: 'application/vnd.ekstep.ecml-archive',
          channel: 'test-channel'
        },
        {
          identifier: 'mock-3',
          name: 'English Practice Questions',
          primaryCategory: 'Practice Question Set',
          duration: '30 minutes',
          status: 'Live',
          contentType: 'QuestionSet',
          resourceType: 'Practice Question Set',
          mimeType: 'application/vnd.ekstep.quml-archive',
          channel: 'test-channel'
        }
      ];
      setContent(mockContent);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm !== undefined) {
        setPageOffset(0);
        setCurrentPage(0);
        loadContent();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Update content when response changes
  useEffect(() => {
    console.log('Response changed:', response);
    if (response?.result?.content) {
      console.log('Setting content:', response.result.content);
      setContent(response.result.content);
    } else {
      console.log('No content in response:', response);
    }
  }, [response]);

  useEffect(() => {
    // Load initial content
    loadContent();
    
    // Load groups from API
    loadGroups();
  }, []);

  // Load groups from API
  const loadGroups = async () => {
    try {
      const groupsResult = await searchGroups({
        limit: 100,
        offset: 0,
        filters: {
          type: 'ADHOC-Group',
          status: ['Active'] // Only show active groups
        }
      });
      
      const groupsData = groupsResult.groups
        .filter(group => group.status === 'Active') // Additional client-side filter
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

  const handleGroupChange = (event: any) => {
    setSelectedGroup(event.target.value);
  };

  const handleContentToggle = (contentId: string) => {
    console.log('Toggling content:', contentId);
    setSelectedContent(prev => {
      const newSelection = prev.includes(contentId) 
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allContentIds = content.map(item => item.identifier);
    setSelectedContent(allContentIds);
  };

  const handleClearAll = () => {
    setSelectedContent([]);
  };

  const handleResetForm = () => {
    setSelectedGroup('');
    setSelectedContent([]);
    setSearchTerm('');
    setSuccess(false);
    setSuccessMessage('');
    setError('');
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('Adding content to group:', {
        groupId: selectedGroup,
        contentIds: selectedContent
      });
      
      const response = await addContentToGroup(selectedGroup, selectedContent);
      
      if (response) {
        const selectedGroupName = groups.find(group => group.id === selectedGroup)?.name || 'the selected group';
        setSuccessMessage(`Successfully added ${selectedContent.length} content item(s) to ${selectedGroupName}`);
        setSuccess(true);
        setSelectedContent([]);
        setSelectedGroup(''); // Clear the group selection
        setSearchTerm(''); // Clear the search term
        console.log('Content added to group successfully');
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
          setSuccessMessage('');
        }, 5000);
      } else {
        throw new Error('Failed to add content to group');
      }
    } catch (err: any) {
      console.error('Error adding content to group:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to add content to group. Please try again.';
      
      if (err.message.includes('Authentication token not found')) {
        errorMessage = 'Please log in again to continue. Your session may have expired.';
      } else if (err.message.includes('Missing required authentication data')) {
        errorMessage = 'Authentication data is missing. Please refresh the page and try again.';
      } else if (err.message.includes('Failed to add content')) {
        errorMessage = `API Error: ${err.message}`;
      } else if (err.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedContentTitles = content
    .filter(item => selectedContent.includes(item.identifier))
    .map(item => item.name);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('GROUPS.ADD_CONTENT_TO_GROUPS')}
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
                {t('GROUPS.SELECT_CONTENT')}
              </Typography>
              
              {/* Content summary */}
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                <Typography variant="body2" color="text.secondary">
                  {isLoadingContent ? (
                    'Loading content...'
                  ) : (
                    `Found ${content.length} content items${searchTerm ? ` matching "${searchTerm}"` : ''}`
                  )}
                </Typography>
              </Box>

              {/* Debug authentication info */}
           
              {/* Search functionality */}
              <Box sx={{ mb: 3 }}>
                {/* Search Bar */}
                <TextField
                  fullWidth
                  placeholder="Search content by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                {/* Action Buttons */}
                {content.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    p: 2,
                    bgcolor: '#f8f9fa',
                    borderRadius: 1,
                    border: '1px solid #e9ecef'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      {content.length} content items found
                      {selectedContent.length > 0 && ` • ${selectedContent.length} selected`}
                    </Typography>
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
                                        onClick={handleClearAll}
                                      >
                                        Deselect All
                                      </Button>
                                    </Box>

                  
                  </Box>
                )}
              </Box>
                
              {isLoadingContent ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : content.length > 0 ? (
                <Grid container spacing={2}>
                  {content.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.identifier}>
                      <Card 
                        sx={{ 
                          border: selectedContent.includes(item.identifier) ? '2px solid #FDBE16' : '1px solid #e0e0e0',
                          height: '100px',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            borderColor: selectedContent.includes(item.identifier) ? '#1976d2' : '#1976d2',
                          }
                        }}
                      >
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1 }}>
                            <Checkbox
                              checked={selectedContent.includes(item.identifier)}
                              onChange={() => handleContentToggle(item.identifier)}
                              sx={{ 
                                p: 0, 
                                mt: 0.5,
                                color: selectedContent.includes(item.identifier) ? '#FDBE16' : '#666',
                                '&.Mui-checked': {
                                  color: '#FDBE16',
                                }
                              }}
                            />
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '50px' }}>
                              <Typography 
                                variant="body2" 
                                component="div" 
                                sx={{ 
                                  fontSize: '12px',
                                  lineHeight: 1.3,
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  mb: 1
                                }}
                              >
                                {item.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                <Chip 
                                  label={item.primaryCategory} 
                                  size="small" 
                                  
                                  variant="filled"
                                  sx={{ 
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    height: '24px'
                                  }}
                                />
                              
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'No content found matching your search.' : 'No content available.'}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
            {selectedContent.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Content:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedContentTitles.map((title, index) => (
                    <Chip key={index} label={title} size="small" />
                  ))}
                </Box>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  disabled={loading || !selectedGroup || selectedContent.length === 0}
                  sx={{ minWidth: 150 }}
                >
                  {loading ? t('COMMON.LOADING') : t('GROUPS.ADD_CONTENT_TO_GROUPS')}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleResetForm}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  Reset Form
                </Button>
              </Box>
            </Grid>
            </Grid>
          </form>
          
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMessage}
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

export default AddContentToGroups;

import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getContentHierarchy } from '../../services/ContentService';
import { useRouter } from 'next/router';
import Loader from '../../components/Loader';
import Layout from '../../components/Layout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { IconButton } from '@mui/material';

const RecursiveAccordion = ({ data }: { data: any[] }) => {
  const router = useRouter();
  const queryParams = router.query;
  const { identifier, ...otherQueryParams } = queryParams;

  const renderAccordion = (nodes: any[], level = 0) => {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }
    
    console.log(`Rendering level ${level} with ${nodes.length} nodes:`, nodes);
    
    return nodes.map((node, index) => {
      if (!node) {
        return null;
      }
      
      return (
      <Box key={`${node?.name || node?.identifier || index}-${index}`} sx={{ marginBottom: '16px' }}>
        {level === 0 ? (
          <>
            {/* Render level 0 name as heading */}
            <Typography
              variant="h1"
              sx={{
                marginBottom: '0.75rem',
                fontWeight: 'bold',
                borderBottom: '1px solid #ddd',
                paddingBottom: '4px',
                paddingLeft: '4px',
              }}
            >
              {node?.name || 'Untitled Course'}
            </Typography>
            {/* Render children as accordions */}
            {node?.children && Array.isArray(node.children) && renderAccordion(node.children, level + 1)}
          </>
        ) : node?.contentType === 'Resource' ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              marginLeft: `${(level - 1) * 20}px`,
              padding: '8px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              },
            }}
            onClick={() =>
              router.push({
                pathname: '/workspace/content/review',
                query: { ...otherQueryParams, identifier: node.identifier, isDiscoverContent: true },
              })
            }
          >
            <Box
              className="facilitator-bg"
              sx={{
                backgroundImage: `url(${
                  node?.appIcon || node?.posterImage || '/decorationBg.png'
                })`,
                position: 'relative',
                height: '50px',
                width: '50px',
                minWidth: '50px',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '4px',
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {node?.name || 'Untitled Resource'}
              </Typography>
              {node?.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {node.description.length > 100 
                    ? `${node.description.substring(0, 100)}...` 
                    : node.description}
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          <Accordion sx={{ marginLeft: `${(level - 1) * 2}px` }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body1" fontWeight={600}>
                {node?.name}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Recursively render children */}
              {node?.children && Array.isArray(node.children) && renderAccordion(node.children, level + 1)}
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
      );
    }).filter(Boolean);
  };

  console.log('RecursiveAccordion received data:', data);
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Box p={3}>
        <Typography>No course data available</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Data received: {JSON.stringify(data, null, 2)}
        </Typography>
      </Box>
    );
  }

  const renderedContent = renderAccordion(data);
  
  if (!renderedContent || renderedContent.length === 0) {
    return (
      <Box p={3}>
        <Typography>No content to display</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Data structure: {JSON.stringify(data[0], null, 2)}
        </Typography>
      </Box>
    );
  }

  return <Box>{renderedContent}</Box>;
};

export default function CourseHierarchy() {
  const router = useRouter();
  const [doId, setDoId] = useState<string | null>(null);
  const [courseHierarchyData, setCourseHierarchyData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>('discover-contents');

  useEffect(() => {
    if (router.isReady && router.query.identifier) {
      setDoId(router.query.identifier as string);
    }
  }, [router.isReady, router.query.identifier]);

  useEffect(() => {
    const fetchCohortHierarchy = async (doId: string): Promise<any> => {
      try {
        setLoading(true);
        setError(null);
        const hierarchyResponse = await getContentHierarchy({
          doId,
        });
        
        console.log('Full hierarchyResponse:', hierarchyResponse);
        console.log('hierarchyResponse.data:', (hierarchyResponse as any)?.data);
        
        // Try different possible response structures
        // Axios returns response.data, so we need to check response.data
        const responseData = (hierarchyResponse as any)?.data;
        let hierarchyData = null;
        
        // Check if response has data.result.content structure (most common)
        if (responseData?.result?.content) {
          hierarchyData = responseData.result.content;
          console.log('Found data in response.data.result.content');
        }
        // Check if response.data.result is the content directly
        else if (responseData?.result && (responseData.result.contentType === 'Course' || responseData.result.children)) {
          hierarchyData = responseData.result;
          console.log('Found data in response.data.result');
        }
        // Check if response.data is the content directly
        else if (responseData && (responseData.contentType === 'Course' || responseData.children)) {
          hierarchyData = responseData;
          console.log('Found data in response.data');
        }
        // Check if response itself is the content (unlikely but possible)
        else if ((hierarchyResponse as any)?.contentType === 'Course' || (hierarchyResponse as any)?.children) {
          hierarchyData = hierarchyResponse;
          console.log('Found data in response itself');
        }
        
        console.log('Extracted hierarchyData:', hierarchyData);
        console.log('hierarchyData type:', typeof hierarchyData);
        console.log('hierarchyData isArray:', Array.isArray(hierarchyData));
        console.log('hierarchyData contentType:', hierarchyData?.contentType);
        console.log('hierarchyData children:', hierarchyData?.children?.length);
        
        if (hierarchyData) {
          // Ensure it's an array for the component
          if (Array.isArray(hierarchyData)) {
            setCourseHierarchyData(hierarchyData);
          } else {
            setCourseHierarchyData([hierarchyData]);
          }
        } else {
          console.error('Could not extract hierarchy data from response');
          setCourseHierarchyData([]);
          setError('No course hierarchy data found');
        }

        return hierarchyResponse;
      } catch (error) {
        console.error('Error fetching solution details:', error);
        setError('Failed to load course hierarchy');
        setCourseHierarchyData([]);
      } finally {
        setLoading(false);
      }
    };

    if (typeof doId === 'string' && doId.trim() !== '') {
      fetchCohortHierarchy(doId);
    }
  }, [doId]);

  const handleBack = () => {
    const previousPage = router.query.previousPage as string || 'discover-contents';
    router.push(`/workspace/content/${previousPage}`);
  };

  if (loading) {
    return (
      <Layout selectedKey={selectedKey} onSelect={setSelectedKey}>
        <Box p={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton 
              onClick={handleBack} 
              sx={{ 
                color: '#1F1B13',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">Course Hierarchy</Typography>
          </Box>
          <Loader showBackdrop={true} loadingText="Loading" />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout selectedKey={selectedKey} onSelect={setSelectedKey}>
        <Box p={3}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              mb: 2,
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 10,
              padding: '8px 0',
            }}
          >
            <IconButton 
              onClick={handleBack} 
              sx={{ 
                color: '#1F1B13',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Course Hierarchy
            </Typography>
          </Box>
          <Typography color="error">{error}</Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout selectedKey={selectedKey} onSelect={setSelectedKey}>
      <Box p={3}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 2,
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 10,
            padding: '8px 0',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <IconButton 
            onClick={handleBack} 
            sx={{ 
              color: '#1F1B13',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
            aria-label="Go back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Course Hierarchy
          </Typography>
        </Box>
        {courseHierarchyData.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, fontSize: '12px' }}>
            <Typography variant="caption" fontWeight="bold">Debug Info:</Typography>
            <Typography variant="caption" component="div" sx={{ display: 'block', mt: 0.5 }}>
              Data count: {courseHierarchyData.length}
            </Typography>
            <Typography variant="caption" component="div" sx={{ display: 'block' }}>
              First item contentType: {courseHierarchyData[0]?.contentType}
            </Typography>
            <Typography variant="caption" component="div" sx={{ display: 'block' }}>
              First item name: {courseHierarchyData[0]?.name}
            </Typography>
            <Typography variant="caption" component="div" sx={{ display: 'block' }}>
              First item children count: {courseHierarchyData[0]?.children?.length || 0}
            </Typography>
          </Box>
        )}
        <RecursiveAccordion data={courseHierarchyData} />
      </Box>
    </Layout>
  );
}

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @nx/enforce-module-boundaries */
import React, { useState } from 'react';
import { Table as KaTable } from 'ka-table';
import { DataType, EditingMode, SortingMode } from 'ka-table/enums';
import { Typography, useTheme, IconButton, Box, Grid, Snackbar, Alert } from '@mui/material';
import UpReviewTinyImage from '@mui/icons-material/LibraryBooks';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import 'ka-table/style.css';
import DeleteIcon from '@mui/icons-material/Delete';
import router from 'next/router';
import { MIME_TYPE } from '@workspace/utils/app.config';
import Image from 'next/image';
import ActionIcon from './ActionIcon';
import { Padding } from '@mui/icons-material';
import Cookies from 'js-cookie';

// Utility function to transform image URL from Azure blob to AWS S3
const transformImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/logo.png';

  if (imageUrl.includes('https://sunbirdsaaspublic.blob.core.windows.net')) {
    // Handle double domain pattern
    if (
      imageUrl.includes(
        'https://sunbirdsaaspublic.blob.core.windows.net/https://sunbirdsaaspublic.blob.core.windows.net'
      )
    ) {
      // Extract everything after the second domain
      const urlParts = imageUrl.split(
        'https://sunbirdsaaspublic.blob.core.windows.net/https://sunbirdsaaspublic.blob.core.windows.net/'
      );
      if (urlParts.length > 1) {
        const pathAfterSecondDomain = urlParts[1];
        // Remove any existing content/content prefix to avoid duplication
        let cleanPath = pathAfterSecondDomain.replace(
          /^content\/content\//,
          ''
        );
        // Remove sunbird-content-prod/schemas/content/ if present
        cleanPath = cleanPath.replace(
          /^sunbird-content-prod\/schemas\/content\//,
          ''
        );
        // Transform to AWS S3 URL with content/content prefix
        return `https://s3.ap-south-1.amazonaws.com/saas-prod/content/content/${cleanPath}`;
      }
    } else {
      // Handle single domain pattern
      const urlParts = imageUrl.split(
        'https://sunbirdsaaspublic.blob.core.windows.net/'
      );
      if (urlParts.length > 1) {
        const pathAfterDomain = urlParts[1];
        // Remove any existing content/content prefix to avoid duplication
        let cleanPath = pathAfterDomain.replace(/^content\/content\//, '');
        // Remove sunbird-content-prod/schemas/content/ if present
        cleanPath = cleanPath.replace(
          /^sunbird-content-prod\/schemas\/content\//,
          ''
        );
        // Transform to AWS S3 URL with content/content prefix
        return `https://s3.ap-south-1.amazonaws.com/saas-prod/content/content/${cleanPath}`;
      }
    }
  }

  return imageUrl;
};
interface CustomTableProps {
  data: any[]; // Define a more specific type for your data if needed
  columns: Array<{
    key: string;
    title: string;
    dataType: DataType;
  }>;
  handleDelete?: any;
  tableTitle?: string;
}

const KaTableComponent: React.FC<CustomTableProps> = ({
  data,
  columns,
  tableTitle,
}) => {
  const theme = useTheme<any>();
  const [open, setOpen] = useState(false);
  const [showReviewToast, setShowReviewToast] = useState(false);

  // Ensure data has unique identifiers for React keys
  const processedData =
    data?.map((item: any, index: number) => ({
      ...item,
      // Ensure each item has a unique identifier for React keys
      identifier: item.identifier || item.id || `row-${index}`,
    })) || [];

  const handleClose = () => {
    setOpen(false);
  };
  const handleOpen = () => setOpen(true);

  const handleCopyUrl = async (url: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the row click
    try {
      await navigator.clipboard.writeText(url);
      console.log('Cloud URL copied to clipboard:', url);
      // You can add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('Cloud URL copied to clipboard (fallback):', url);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const openEditor = (content: any) => {
    const identifier = content?.identifier;
    let mode = content?.mode; // default mode from content, can be overwritten by tableTitle
    switch (tableTitle) {
      case 'draft':
        mode = !mode ? 'edit' : mode;
        Cookies.set('contentMode', mode);

        // Use draft-specific routing
        if (content?.mimeType === MIME_TYPE.QUESTIONSET_MIME_TYPE) {
          router.push({ pathname: `/editor`, query: { identifier } });
        } else if (
          content?.mimeType &&
          MIME_TYPE.GENERIC_MIME_TYPE.includes(content?.mimeType)
        ) {
          sessionStorage.setItem('previousPage', window.location.href);
          router.push({ pathname: `/upload-editor`, query: { identifier } });
        } else if (
          content?.mimeType &&
          MIME_TYPE.COLLECTION_MIME_TYPE.includes(content?.mimeType)
        ) {
          router.push({ pathname: `/collection`, query: { identifier } });
        } else if (
          content?.mimeType &&
          MIME_TYPE.ECML_MIME_TYPE.includes(content?.mimeType) &&
          mode !== 'review'
        ) {
          router.push({ pathname: `/resource-editor`, query: { identifier } });
        }
        return; // Exit early since draft has specific routing logic

      case 'publish':
      case 'discover-contents':
      case 'submitted':
        mode = 'read';
        break;

      case 'upForReview':
        mode = 'review';
        break;

      case 'all-content':
        mode =
          content?.status === 'Draft' || content?.status === 'Live'
            ? 'edit'
            : 'review';
        break;

      default:
        mode = mode || 'read';
        break;
    }

    // Save mode in cookies
    Cookies.set('contentMode', mode);
    
    // Generic routing for cases other than 'draft'
    if (content?.mimeType === MIME_TYPE.QUESTIONSET_MIME_TYPE) {
      router.push({ pathname: `/editor`, query: { identifier } });
    } else if (tableTitle === 'submitted') {
      // Submitted content always goes to read-only details view
      router.push({
        pathname: `/workspace/content/review`,
        query: { identifier },
      });
    } else if (tableTitle === 'discover-contents') {
      content.contentType === 'Course'
        ? router.push({
            pathname: `/course-hierarchy/${identifier}`,
            query: { identifier, previousPage: 'discover-contents' },
          })
        : router.push({
            pathname: `/workspace/content/review`,
            query: { identifier, isDiscoverContent: true },
          });
    } else if (
      content?.mimeType &&
      MIME_TYPE.GENERIC_MIME_TYPE.includes(content?.mimeType)
    ) {
      Cookies.set('contentCreatedBy', content?.createdBy);
      const pathname =
        tableTitle === 'upForReview'
          ? `/workspace/content/review`
          : `/upload-editor`;
      router.push({ pathname, query: { identifier } });
    } else if (
      content?.mimeType &&
      MIME_TYPE.ECML_MIME_TYPE.includes(content?.mimeType)
    ) {
      Cookies.set('contentCreatedBy', content?.createdBy);
      const pathname =
        tableTitle === 'upForReview'
          ? `/workspace/content/review`
          : `/resource-editor`;
      router.push({ pathname, query: { identifier } });
      // router.push({ pathname: `/resource-editor`, query: { identifier } });
    } else if (
      content?.mimeType &&
      MIME_TYPE.COLLECTION_MIME_TYPE.includes(content?.mimeType)
    ) {
      router.push({ pathname: `/collection`, query: { identifier } });
    } else if (content?.contentType === 'Course' || content?.primaryCategory === 'Course') {
      // Fallback: if it's a course but didn't match other conditions, open in collection editor
      router.push({ pathname: `/collection`, query: { identifier } });
    }
  };
  return (
    <>
      <KaTable
        columns={columns}
        data={processedData}
        // editingMode={EditingMode.Cell}
        rowKeyField={'identifier'}
        sortingMode={SortingMode.Single}
        childComponents={{
          cellText: {
            content: (props) => {
              if (
                props.column.key === 'name' ||
                props.column.key === 'title_and_description'
              ) {
                // Check if content is in Review status for all-content table
                const isReviewStatus = tableTitle === 'all-content' && props.rowData.status === 'Review';
                
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: isReviewStatus ? 'not-allowed' : 'pointer',
                      opacity: isReviewStatus ? 0.6 : 1,
                    }}
                    onClick={() => {
                      if (!isReviewStatus) {
                        openEditor(props.rowData);
                      } else {
                        setShowReviewToast(true);
                      }
                    }}
                    title={isReviewStatus ? 'Click to see why this content is locked' : ''}
                  >
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item xs={3} md={3} lg={3} xl={2}>
                        {props.rowData.image ? (
                          <Box
                            style={{
                              width: '60px',
                              height: '40px',
                              padding: '10px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              // background: '#F1E6D6'
                            }}
                          >
                            <img
                              src={transformImageUrl(props.rowData.image)}
                              alt="Image"
                              style={{
                                maxWidth: '100%',
                                height: 'auto%',
                                objectFit: 'cover',
                                borderRadius: '8px',
                              }}
                              onError={(e) => {
                                e.currentTarget.src = '/logo.png';
                              }}
                              onLoad={() => {}}
                            />
                          </Box>
                        ) : props.column.key === 'name' ? (
                          <Box
                            style={{
                              width: '60px',
                              height: '40px',
                              padding: '10px',
                              borderRadius: '8px',

                              overflow: 'hidden',
                              // background: '#F1E6D6'
                            }}
                          >
                            <img
                              src={'/logo.png'}
                              height="25px"
                              alt="Image"
                              style={{
                                maxWidth: '100%',
                                height: 'auto%',
                                objectFit: 'cover',
                                borderRadius: '8px',
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            style={{
                              width: '60px',
                              height: '40px',
                              padding: '10px', // Fixed casing
                              borderRadius: '8px',

                              overflow: 'hidden', // Ensures content doesn't overflow the box
                              // background: '#F1E6D6'
                            }}
                          >
                            <img
                              src={'/logo.png'}
                              height="25px"
                              alt="Image"
                              style={{
                                maxWidth: '100%',
                                height: 'auto',
                                objectFit: 'cover',
                                borderRadius: '8px',
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </Box>
                        )}
                      </Grid>
                      <Grid item xs={9} md={9} lg={9} xl={10}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 500,
                                color: '#1F1B13',
                                fontSize: '14px',
                                flex: 1,
                              }}
                              className="one-line-text"
                            >
                              {props.rowData.name || 'Untitled'}
                            </Typography>
                            {/* Show copy icon only for swadhaar-channel content with URL */}
                            {props.rowData.channel === 'swadhaar-channel' &&
                              props.rowData.url && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleCopyUrl(props.rowData.url, e)}
                                  sx={{
                                    padding: '4px',
                                    color: '#969088',
                                    '&:hover': {
                                      color: '#4D4639',
                                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    },
                                  }}
                                  title="Copy Cloud URL"
                                >
                                  <ContentCopyIcon sx={{ fontSize: '16px' }} />
                                </IconButton>
                              )}
                          </div>
                          <div>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 400,
                                color: '#635E57',
                                fontSize: '12px',
                              }}
                              className="two-line-text"
                              color={theme.palette.warning['A200']}
                            >
                              {props.column.key === 'name'
                                ? props.rowData.primaryCategory
                                : props.rowData.description || props.rowData.primaryCategory || '-'}
                            </Typography>
                          </div>
                        </div>
                      </Grid>
                    </Grid>
                  </div>
                );
              } else if (props.column.key === 'status') {
                if (props.rowData.status === 'Draft') {
                  return (
                    <Typography
                      sx={{ fontSize: '14px', fontWeight: 500 }}
                      variant="body2"
                      className="one-line-text"
                      color={'#987100'}
                    >
                      {props.rowData.status}
                    </Typography>
                  );
                }
                if (props.rowData.status === 'Review') {
                  return (
                    <Typography
                      className="one-line-text"
                      sx={{ fontSize: '14px', fontWeight: 500 }}
                      variant="body2"
                      color={'#BA1A1A'}
                    >
                      {props.rowData.status}
                    </Typography>
                  );
                }
                if (props.rowData.status === 'Live') {
                  return (
                    <Typography
                      className="one-line-text"
                      sx={{ fontSize: '14px', fontWeight: 500 }}
                      variant="body2"
                      color={'#06A816'}
                    >
                      {props.rowData.status}
                    </Typography>
                  );
                }
              } else if (props.column.key === 'create-by') {
                if (props?.rowData?.creator || props?.rowData?.author)
                  return (
                    <Typography
                      sx={{ fontSize: '14px', fontWeight: 500 }}
                      variant="body2"
                      color={'#987100'}
                    >
                      {props?.rowData?.creator || props?.rowData?.author}
                    </Typography>
                  );
                else
                  return (
                    <Typography
                      sx={{ fontSize: '14px', fontWeight: 500 }}
                      variant="body2"
                      color={'#987100'}
                    >
                      -
                    </Typography>
                  );
              } else if (props.column.key === 'contentAction') {
                {
                  // Disable action for Review status in all-content table
                  const isReviewStatus = tableTitle === 'all-content' && props.rowData.status === 'Review';
                  if (isReviewStatus) {
                    return <div style={{ opacity: 0.3 }}>-</div>;
                  }
                  return (
                    <>
                      <ActionIcon rowData={props.rowData} />
                    </>
                  );
                }
              } else if (props.column.key === 'action') {
                // Disable action for Review status in all-content table
                const isReviewStatus = tableTitle === 'all-content' && props.rowData.status === 'Review';
                if (isReviewStatus) {
                  return <div style={{ opacity: 0.3 }}>-</div>;
                }
                return (
                  <ActionIcon rowData={props.rowData} tableTitle={tableTitle} />
                );
              } else if (props.column.key === 'contentType') {
                return (
                  <Typography
                    className="one-line-text"
                    sx={{ fontSize: '14px' }}
                    variant="body2"
                  >
                    {props?.rowData?.contentType}
                  </Typography>
                );
              } else if (props.column.key === 'lastUpdatedOn') {
                return (
                  <Typography
                    className="one-line-text"
                    sx={{ fontSize: '14px' }}
                    variant="body2"
                  >
                    {props?.rowData?.lastUpdatedOn}
                  </Typography>
                );
              }

              return props.children;
            },
          },
        }}
        noData={{
          text: 'No data found',
        }}
      />
      
      {/* Toast notification for Review status content */}
      <Snackbar
        open={showReviewToast}
        autoHideDuration={4000}
        onClose={() => setShowReviewToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowReviewToast(false)} 
          severity="warning" 
          sx={{ width: '100%' }}
        >
          Content in Review status cannot be opened from this page. Please go to &ldquo;Up For Review&rdquo; page to review and publish this content.
        </Alert>
      </Snackbar>
    </>
  );
};

export default KaTableComponent;

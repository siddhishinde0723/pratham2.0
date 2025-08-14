import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Papa from 'papaparse';
import { ContentService } from '../../../services/ContentService';
import Layout from '../../../components/Layout';
import WorkspaceHeader from '@workspace/components/WorkspaceHeader';

const contentService = new ContentService();

interface UploadedData {
  topic?: string;
  sub_category?: string;
  cont_tagwords?: string;
  cont_description?: string;
  cont_title?: string;
  language?: string;
  resourse_type?: string;
  author?: string;
  publisher?: string;
  year?: string;
  cont_url?: string;
  cont_dwurl?: string;
  access?: string;
  image?: string;
  thumbnail?: string;
  domain?: string;
  sub_domain?: string;
  content_language?: string;
  primary_user?: string;
  target_age_group?: string;
  program?: string;
  old_system_content_id?: string;
}

interface ImportStatus {
  progress: number;
  message: string;
}

const BulkUpload: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('bulk-upload');
  const [showHeader, setShowHeader] = useState<boolean | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [currentRecord, setCurrentRecord] = useState<number>(0);
  const [processedRecords, setProcessedRecords] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }>({
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  });

  useEffect(() => {
    const headerValue = localStorage.getItem('showHeader');
    setShowHeader(headerValue === 'true');
  }, []);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);

      // Get authentication token - try multiple possible storage keys
      const userToken =
        localStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('access_token');

      // Get user ID - try multiple possible storage keys
      const userId =
        localStorage.getItem('userId') ||
        localStorage.getItem('user_id') ||
        (() => {
          const userData = localStorage.getItem('userData');
          if (userData) {
            try {
              const parsed = JSON.parse(userData);
              return parsed.userId || parsed.user_id || parsed.id;
            } catch (e) {
              console.error('Error parsing userData:', e);
              return null;
            }
          }
          return null;
        })();

      if (!userToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      if (!uploadedData.length) {
        throw new Error('No data to publish. Please upload a CSV file first.');
      }

      setProcessedRecords({
        total: uploadedData.length,
        success: 0,
        failed: 0,
        errors: [],
      });

      for (let i = 0; i < uploadedData.length; i++) {
        const record = uploadedData[i];
        setCurrentRecord(i + 1);

        try {
          // Validate required fields
          if (!record.cont_title?.trim() || !record.cont_dwurl?.trim()) {
            throw new Error('Title and Download URL are required');
          }

          // Process the record
          await contentService.processContent(record, userId, userToken);

          setProcessedRecords((prev) => ({
            ...prev,
            success: prev.success + 1,
          }));
        } catch (error) {
          console.error(`Error processing record ${i + 1}:`, error);
          setProcessedRecords((prev) => ({
            ...prev,
            failed: prev.failed + 1,
            errors: [
              ...prev.errors,
              `Record ${i + 1}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            ],
          }));
        }
      }

      // Show final status
      setSnackbar({
        open: true,
        message: `Processing complete. Success: ${processedRecords.success}, Failed: ${processedRecords.failed}`,
        severity: processedRecords.failed === 0 ? 'success' : 'warning',
      });
    } catch (error) {
      console.error('Publishing error:', error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : 'Failed to publish content',
        severity: 'error',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'topic',
      'sub_category',
      'cont_tagwords',
      'cont_description',
      'cont_title',
      'language',
      'resourse_type',
      'author',
      'publisher',
      'year',
      'cont_url',
      'cont_dwurl',
      'access',
      'image',
      'thumbnail',
      'domain',
      'sub_domain',
      'content_language',
      'primary_user',
      'target_age_group',
      'program',
    ];
    const csv = Papa.unparse([headers]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Filter out empty rows
          const validData = (results.data as UploadedData[]).filter((row) => {
            // Check if row has any non-empty values
            return Object.values(row).some(
              (value) => value && value.trim() !== ''
            );
          });

          console.log('Parsed CSV data:', validData);
          setUploadedData(validData);
          setIsUploading(false);
          setSnackbar({
            open: true,
            message: `Successfully uploaded ${validData.length} record(s)`,
            severity: 'success',
          });
        },
        error: (error) => {
          setIsUploading(false);
          setSnackbar({
            open: true,
            message: `Error uploading file: ${error.message}`,
            severity: 'error',
          });
        },
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      {showHeader && <WorkspaceHeader />}
      <Layout selectedKey={selectedKey} onSelect={setSelectedKey}>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0px 2px 6px 2px #00000026',
              p: 3,
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 'bold', fontSize: '16px', mb: 3 }}
            >
              Bulk Upload
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={handleDownloadTemplate}
                disabled={isUploading || isPublishing}
              >
                Download Template
              </Button>

              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={isUploading || isPublishing}
              >
                Upload Content
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>

            {(isUploading || isPublishing) && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress />
              </Box>
            )}

            {uploadedData.length > 0 && (
              <>
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {Object.keys(uploadedData[0]).map((header) => (
                          <TableCell key={header}>{header}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadedData.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>{value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  sx={{ mt: 2 }}
                >
                  {isPublishing ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Publishing...
                    </>
                  ) : (
                    'Publish'
                  )}
                </Button>
              </>
            )}

            {processedRecords.total > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">
                  Processing Records: {currentRecord} / {processedRecords.total}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Typography>Success: {processedRecords.success}</Typography>
                  <Typography>Failed: {processedRecords.failed}</Typography>
                </Box>
                {processedRecords.errors.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" color="error">
                      Errors:
                    </Typography>
                    {processedRecords.errors.map((error, index) => (
                      <Typography key={index} color="error">
                        {error}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={handleCloseSnackbar}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Box>
        </Box>
      </Layout>
    </>
  );
};

export default BulkUpload;

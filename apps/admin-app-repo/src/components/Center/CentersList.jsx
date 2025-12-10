// apps/admin-app-repo/src/components/Center/CentersList.jsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

const CentersList = ({ centers, onEdit, onDelete, onView }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'school':
        return 'primary';
      case 'community':
        return 'secondary';
      case 'online':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Center Name</TableCell>
            <TableCell>Center Code</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Students</TableCell>
            <TableCell>Teachers</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {centers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                <Typography color="textSecondary">No centers found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            centers.map((center) => (
              <TableRow key={center.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor:
                          center.type === 'school'
                            ? '#4caf50'
                            : center.type === 'community'
                            ? '#ff9800'
                            : '#2196f3',
                        width: 32,
                        height: 32,
                      }}
                    >
                      {center.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {center.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {center.id}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{center.code}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2">{center.location}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={center.type}
                    size="small"
                    color={getTypeColor(center.type)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={center.status}
                    size="small"
                    color={getStatusColor(center.status)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {center.studentCount || 0}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {center.teacherCount || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{center.createdAt}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => onView(center)}
                      title="View Details"
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(center)}
                      title="Edit Center"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(center.id)}
                      title="Delete Center"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CentersList;

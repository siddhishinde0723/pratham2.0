import React from 'react';
import { Box, Typography } from '@mui/material';

const NoDataFound = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 5,
                textAlign: 'center',
            }}
        >
            <Typography variant="h6" color="textSecondary">
                No Data Found
            </Typography>
        </Box>
    );
};

export default NoDataFound;

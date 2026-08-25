import React, { useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import DeleteConfirmation from './DeleteConfirmation';

interface ActionIconProps {
    rowData?: any;
    onDeleteSuccess?: () => void;
}

const ActionIcon: React.FC<ActionIconProps> = ({
    rowData,
    onDeleteSuccess,
}) => {
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
    };
    const handleOpen = () => {
        setOpen(true);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100px',
            }}
        >
            <Tooltip title={'Delete'}>
                <Box
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpen();
                    }}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#F8EFE7',
                        p: '8px',
                        borderRadius: '4px',
                    }}
                >
                    <img
                        src={'/delete.png'} // Note: Reusing the same image path, assuming it exists or will be provided
                        height="18px"
                        alt="Delete"
                        onError={(e) => {
                            e.currentTarget.src = '/logo.png';
                        }}
                    />
                </Box>
            </Tooltip>

            <DeleteConfirmation
                open={open}
                handleClose={handleClose}
                rowData={rowData}
                onDeleteSuccess={onDeleteSuccess}
            />
        </Box>
    );
};

export default ActionIcon;

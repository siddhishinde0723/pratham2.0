import React, { useState } from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import DeleteConfirmation from './DeleteConfirmation';
import router from 'next/router';
import { MIME_TYPE } from '@workspace/utils/app.config';

interface ActionCellProps {
  rowData?: any;
  tableTitle?: string;
}

const ActionIcon: React.FC<ActionCellProps> = ({
  rowData,
  tableTitle,
  //  onEdit,
}) => {
  const theme = useTheme<any>();
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };
  const handleOpen = () => {
    setOpen(true);
  };

  const handleView = () => {
    const identifier = rowData?.identifier;
    const mode = 'read';
    if (rowData?.mimeType === MIME_TYPE.QUESTIONSET_MIME_TYPE) {
      router.push({ pathname: `/editor`, query: { identifier, mode } });
    } else if (
      rowData?.mimeType &&
      MIME_TYPE.GENERIC_MIME_TYPE.includes(rowData?.mimeType)
    ) {
      sessionStorage.setItem('previousPage', window.location.href);
      router.push({ pathname: `/upload-editor`, query: { identifier } });
    } else if (
      rowData?.mimeType &&
      MIME_TYPE.COLLECTION_MIME_TYPE.includes(rowData?.mimeType)
    ) {
      router.push({ pathname: `/collection`, query: { identifier, mode } });
    }
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
      {tableTitle === 'publish' && (
        <Tooltip title={'View'}>
          <Box
            onClick={handleView}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              backgroundColor: '#E8F5E9',
              p: '8px',
              borderRadius: '4px',
            }}
          >
            <img
              src={'/view.png'}
              height="18px"
              alt="View"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </Box>
        </Tooltip>
      )}
      <Tooltip title={'Delete'}>
        <Box
          onClick={() => {
            console.log(rowData);
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
            src={'/delete.png'}
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
      />
    </Box>
  );
};

export default ActionIcon;

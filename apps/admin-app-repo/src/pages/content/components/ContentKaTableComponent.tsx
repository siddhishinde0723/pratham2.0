import React from 'react';
import { Table as KaTable } from 'ka-table';
import { SortingMode } from 'ka-table/enums';
import { Typography, Box, Grid } from '@mui/material';
import 'ka-table/style.css';
import { timeAgo } from '@/utils/Helper';
import ActionIcon from './ActionIcon';

interface ContentKaTableProps {
    data: any[];
    columns: any[];
    onDeleteSuccess?: () => void;
    onRowClick?: (rowData: any) => void;
}

const ContentKaTableComponent: React.FC<ContentKaTableProps> = ({ data, columns, onDeleteSuccess, onRowClick }) => {
    const processedData = data?.map((item, index) => ({
        ...item,
        identifier: item.identifier || `row-${index}`,
        lastUpdatedOnFormatted: item.lastUpdatedOn ? timeAgo(item.lastUpdatedOn) : '',
    })) || [];

    return (
        <KaTable
            columns={columns}
            data={processedData}
            rowKeyField={'identifier'}
            sortingMode={SortingMode.Single}
            childComponents={{
                row: {
                    elementAttributes: (props) => ({
                        onClick: () => {
                            if (onRowClick) {
                                onRowClick(props.rowData);
                            }
                        },
                        style: { cursor: 'pointer' },
                    }),
                },
                cellText: {
                    content: (props) => {
                        if (props.column.key === 'title_and_description') {
                            return (
                                <Box
                                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={() => {
                                        if (onRowClick) {
                                            onRowClick(props.rowData);
                                        }
                                    }}
                                >
                                    <Grid container alignItems="center" spacing={1}>
                                        <Grid item xs={3}>
                                            <Box
                                                sx={{
                                                    width: '60px',
                                                    height: '40px',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    backgroundColor: '#f5f5f5',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <img
                                                    src={props.rowData.image || '/logo.png'}
                                                    alt="Content"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/logo.png';
                                                    }}
                                                />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={9}>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    fontWeight: 500,
                                                    fontSize: '14px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {props.rowData.name || 'Untitled'}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: '12px',
                                                    color: '#666',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {props.rowData.description || props.rowData.primaryCategory || '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            );
                        }
                        if (props.column.key === 'status') {
                            const statusColors = {
                                Draft: '#987100',
                                Review: '#BA1A1A',
                                Live: '#06A816',
                            };
                            const color = (statusColors as any)[props.rowData.status] || '#666';
                            return (
                                <Typography sx={{ fontSize: '14px', fontWeight: 500, color }}>
                                    {props.rowData.status}
                                </Typography>
                            );
                        }
                        if (props.column.key === 'lastUpdatedOn') {
                            return (
                                <Typography sx={{ fontSize: '14px' }}>
                                    {props.rowData.lastUpdatedOnFormatted}
                                </Typography>
                            );
                        }
                        if (props.column.key === 'action') {
                            return (
                                <ActionIcon rowData={props.rowData} onDeleteSuccess={onDeleteSuccess} />
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
    );
};

export default ContentKaTableComponent;

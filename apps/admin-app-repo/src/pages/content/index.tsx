import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    Typography,
    Box,
    useTheme,
} from '@mui/material';
import { useRouter } from 'next/router';
import { DataType } from 'ka-table/enums';
import { contentSearch } from '@/services/ContentService';
import useTenantConfig from '@/hooks/useTenantConfig';
import { CONTENT_LIMIT, MIME_TYPE } from '@/utils/app.constant';
import SearchBox from './components/SearchBox';
import PaginationComponent from './components/PaginationComponent';
import ContentKaTableComponent from './components/ContentKaTableComponent';
import Loader from '@/components/Loader';

const AllContentsPage = () => {
    const tenantConfig = useTenantConfig();
    const theme = useTheme();
    const router = useRouter();

    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [refresh, setRefresh] = useState(false);

    const filterOption: string[] = router.query.filterOptions
        ? JSON.parse(router.query.filterOptions as string)
        : [];
    const [filter, setFilter] = useState<string[]>(filterOption);

    const sort: string = typeof router.query.sort === 'string' ? router.query.sort : 'Modified On';
    const [sortBy, setSortBy] = useState(sort);

    const statusQuery: string = typeof router.query.status === 'string' ? router.query.status : 'All';
    const [statusBy, setStatusBy] = useState<string>(statusQuery);

    const [contentList, setContentList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const columns = [
        {
            key: 'title_and_description',
            title: 'TITLE & DESCRIPTION',
            dataType: DataType.String,
            width: '450px',
        },
        {
            key: 'displayContentType',
            title: 'CONTENT TYPE',
            dataType: DataType.String,
            width: '200px',
        },
        { key: 'status', title: 'STATUS', dataType: DataType.String, width: '100px' },
        {
            key: 'lastUpdatedOn',
            title: 'LAST MODIFIED',
            dataType: DataType.String,
            width: '180px',
        },
        {
            key: 'action',
            title: 'ACTION',
            dataType: DataType.String,
            width: '100px',
        }
    ];

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setPage(0);
    };

    const handleFilterChange = (newFilter: string[]) => {
        setFilter(newFilter);
        setPage(0);
    };

    const handleSortChange = (newSortBy: string) => {
        setSortBy(newSortBy);
    };

    const handleStatusChange = (newStatusBy: string) => {
        setStatusBy(newStatusBy);
        setPage(0);
    };

    const handleDeleteSuccess = () => {
        setRefresh(!refresh);
    };

    const handleRowClick = (rowData: any) => {
        const { identifier, primaryCategory, contentType, mimeType } = rowData;
        console.log('Row clicked:', rowData);
        const isHierarchy =
            primaryCategory === 'Course' ||
            contentType === 'Course' ||
            primaryCategory === 'Collection' ||
            contentType === 'Collection' ||
            mimeType === MIME_TYPE.COLLECTION_MIME_TYPE ||
            mimeType === MIME_TYPE.COURSE_MIME_TYPE;

        if (isHierarchy) {
            router.push(`/course-hierarchy/${identifier}`);
        } else {
            router.push(`/play/content/${identifier}`);
        }
    };

    useEffect(() => {
        const getContentList = async () => {
            try {
                if (!tenantConfig) return;
                setLoading(true);

                let status = [
                    // 'Draft',
                    // 'FlagDraft',
                    // 'Review',
                    // 'Processing',
                    'Live',
                    // 'Unlisted',
                    // 'FlagReview',
                ];

                if (statusBy !== 'All' && statusBy !== '') {
                    status = [statusBy];
                }

                const query = debouncedSearchTerm || '';
                const primaryCategory = filter.length ? filter : [];
                const order = sortBy === 'Created On' ? 'asc' : 'desc';
                const sort_by = {
                    lastUpdatedOn: order,
                };

                const offset = page * CONTENT_LIMIT;

                const searchFilters: any = {
                    status,
                    primaryCategory,
                };

                if (query) {
                    searchFilters.name = query;
                }

                const response = await contentSearch({
                    limit: CONTENT_LIMIT,
                    offset,
                    filters: searchFilters,
                    sort: sort_by
                });

                setContentList(response?.content || []);
                setTotalCount(response?.count || 0);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching content:', error);
                setLoading(false);
            }
        };
        getContentList();
    }, [tenantConfig, debouncedSearchTerm, filter, sortBy, statusBy, page, refresh]);

    const tableData = useMemo(() => {
        return contentList.map(item => ({
            ...item,
            image: item.appIcon || item.posterImage || item.appicon,
            displayContentType: item.primaryCategory || item.contentType,
        }));
    }, [contentList]);

    return (
        <Box p={3}>
            <Box
                sx={{
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0px 2px 6px 2px #00000026',
                    pb: totalCount > CONTENT_LIMIT ? '15px' : '0px',
                }}
            >
                <Box p={2}>
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 'bold', fontSize: '16px' }}
                    >
                        All Contents
                    </Typography>
                </Box>

                <Box mb={3}>
                    <SearchBox
                        placeholder="Search by title..."
                        onSearch={handleSearch}
                        onFilterChange={handleFilterChange}
                        onSortChange={handleSortChange}
                        onStatusChange={handleStatusChange}
                        allContents={true}
                    />
                </Box>

                {loading ? (
                    <Loader showBackdrop={true} loadingText={'Loading'} />
                ) : (
                    <Box className="table-ka-container" sx={{ mx: 2 }}>
                        <ContentKaTableComponent
                            columns={columns}
                            data={tableData}
                            onDeleteSuccess={handleDeleteSuccess}
                            onRowClick={handleRowClick}
                        />
                    </Box>
                )}

                {totalCount > CONTENT_LIMIT && (
                    <Box px={2}>
                        <PaginationComponent
                            count={Math.ceil(totalCount / CONTENT_LIMIT)}
                            page={page}
                            setPage={setPage}
                            onPageChange={(event, newPage) => setPage(newPage - 1)}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default AllContentsPage;

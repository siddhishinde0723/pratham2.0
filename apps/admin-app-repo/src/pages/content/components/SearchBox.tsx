import React, { useEffect, useState } from 'react';
import {
    Box,
    Checkbox,
    FormControl,
    Grid,
    IconButton,
    InputBase,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    useTheme,
    SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { debounce } from 'lodash';
import { getPrimaryCategory } from '@/services/ContentService';
import { SortOptions, StatusOptions } from '@/utils/app.constant';
import { useRouter } from 'next/router';
import useTenantConfig from '@/hooks/useTenantConfig';

export interface SearchBarProps {
    onSearch: (value: string) => void;
    value?: string;
    onClear?: () => void;
    placeholder: string;
    onFilterChange?: (selectedFilters: string[]) => void;
    onSortChange?: (sortBy: string) => void;
    onStatusChange?: (status: string) => void;
    onStateChange?: (state: string) => void;

    allContents?: boolean;
    discoverContents?: boolean;
}

const SearchBox: React.FC<SearchBarProps> = ({
    onSearch,
    value = '',
    placeholder = 'Search...',
    onFilterChange,
    onSortChange,
    onStatusChange,
    allContents = false,
}) => {
    const router = useRouter();
    const theme = useTheme();
    const tenantConfig = useTenantConfig();
    const [searchTerm, setSearchTerm] = useState(value);
    const sort: string =
        typeof router.query.sort === 'string' ? router.query.sort : 'Modified On';

    const [sortBy, setSortBy] = useState<string>(sort);
    const statusQuery: string =
        typeof router.query.status === 'string' ? router.query.status : 'All';
    const [status, setStatus] = useState<string>(statusQuery);

    const filterOption: string[] = router.query.filterOptions
        ? JSON.parse(router.query.filterOptions as string)
        : [];
    const [selectedFilters, setSelectedFilters] =
        useState<string[]>(filterOption);

    const [primaryCategory, setPrimaryCategory] = useState<string[]>([]);

    useEffect(() => {
        if (!tenantConfig) return;

        const PrimaryCategoryData = async () => {
            try {
                const response = await getPrimaryCategory(tenantConfig.CHANNEL_ID);
                if (!response?.channel) return;
                const collectionPrimaryCategories =
                    response?.channel?.collectionPrimaryCategories || [];
                const contentPrimaryCategories =
                    response?.channel?.contentPrimaryCategories || [];

                const PrimaryCategory = [
                    ...collectionPrimaryCategories,
                    ...contentPrimaryCategories,
                ];

                // Filter to show only specific content types
                const allowedCategories = ['Course', 'Learning Resource', 'Practice Question Set'];
                const filteredPrimaryCategory = PrimaryCategory.filter(category =>
                    allowedCategories.includes(category)
                );

                setPrimaryCategory(filteredPrimaryCategory || []);
                localStorage.setItem('PrimaryCategory', JSON.stringify(filteredPrimaryCategory));
            } catch (error) {
                console.error('Error fetching primary categories:', error);
            }
        };
        PrimaryCategoryData();
    }, [tenantConfig]);

    const handleSearchClear = () => {
        onSearch('');
        setSearchTerm('');
    };

    const handleSearch = debounce((searchTerm: string) => {
        onSearch(searchTerm);
    }, 300);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const term = event.target.value;
        setSearchTerm(term);

        if (term.length >= 3) {
            handleSearch(term);
        } else if (term.length === 0 || term === '') {
            handleSearchClear();
            onSearch('');
        }
    };

    const handleFilterChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value as string[];
        router.push(
            {
                pathname: router.pathname,
                query: {
                    ...router.query,
                    page: 1,
                    filterOptions: JSON.stringify(value),
                },
            },
            undefined,
            { shallow: true }
        );
        setSelectedFilters(value);
        onFilterChange && onFilterChange(value);
    };

    const handleSortChange = (event: SelectChangeEvent<string>) => {
        const value = event.target.value as string;
        router.push(
            {
                pathname: router.pathname,
                query: { ...router.query, sort: value },
            },
            undefined,
            { shallow: true }
        );
        setSortBy(value);
        onSortChange && onSortChange(value);
    };

    const handleStatusChange = (event: SelectChangeEvent<string>) => {
        const value = event.target.value as string;
        router.push(
            {
                pathname: router.pathname,
                query: { ...router.query, status: value },
            },
            undefined,
            { shallow: true }
        );
        setStatus(value);
        onStatusChange && onStatusChange(value);
    };

    return (
        <Box sx={{ mx: 2 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={12} lg={6}>
                    <Box sx={{ mt: 2 }}>
                        <Paper
                            component="form"
                            onSubmit={(e) => e.preventDefault()}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: (theme.palette.warning as any)['A700'] || '#fff9c4',
                                borderRadius: '8px',
                                '& .MuiOutlinedInput-root fieldset': { border: 'none' },
                                '& .MuiOutlinedInput-input': { borderRadius: 8 },
                            }}
                        >
                            <InputBase
                                value={searchTerm}
                                onChange={handleChange}
                                sx={{
                                    ml: theme.spacing(3),
                                    flex: 1,
                                    fontSize: '16px',
                                    fontFamily: 'Poppins',
                                    color: '#000000DB',
                                }}
                                placeholder={placeholder}
                                inputProps={{ 'aria-label': placeholder }}
                            />
                            <IconButton
                                type="button"
                                onClick={searchTerm ? handleSearchClear : undefined}
                                sx={{ p: theme.spacing(1.25) }}
                                aria-label={searchTerm ? 'Clear' : 'Search'}
                            >
                                {searchTerm ? <ClearIcon /> : <SearchIcon />}
                            </IconButton>
                        </Paper>
                    </Box>
                </Grid>

                <Grid
                    item
                    xs={12}
                    md={12}
                    lg={allContents ? 2 : 3}
                    justifySelf={'end'}
                >
                    <FormControl sx={{ width: '100%', mt: 2 }}>
                        <InputLabel sx={{ color: '#000000DB' }}>Filter By</InputLabel>
                        <Select
                            multiple
                            value={selectedFilters}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Filter By" />}
                            renderValue={(selected) => (selected as string[]).join(', ')}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&.Mui-focused fieldset': { borderColor: '#000' },
                                },
                                '& .MuiSelect-select': {
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                },
                            }}
                        >
                            {primaryCategory?.map((option) => (
                                <MenuItem
                                    key={option}
                                    value={option}
                                    sx={{
                                        color: '#000',
                                        '& .MuiCheckbox-root': {
                                            color: '#000',
                                            '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                                                color: '#000',
                                            },
                                        },
                                        '& .MuiSvgIcon-root': { fontSize: '20px' },
                                    }}
                                >
                                    <Checkbox
                                        checked={selectedFilters.indexOf(option) > -1}
                                        sx={{
                                            color: '#000',
                                            '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                                                color: '#000',
                                            },
                                        }}
                                    />
                                    <ListItemText primary={option} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid
                    item
                    xs={12}
                    md={12}
                    lg={allContents ? 2 : 3}
                    justifySelf={'end'}
                >
                    <FormControl sx={{ width: '100%', mt: 2 }}>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={sortBy}
                            onChange={handleSortChange}
                            input={<OutlinedInput label="Sort By" />}
                        >
                            {SortOptions?.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {allContents && (
                    <Grid item xs={12} md={12} lg={2} justifySelf={'end'}>
                        <FormControl sx={{ width: '100%', mt: 2 }}>
                            <InputLabel>Filter By Status</InputLabel>
                            <Select
                                value={status}
                                onChange={handleStatusChange}
                                input={<OutlinedInput label="Filter By Status" />}
                            >
                                {StatusOptions?.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default SearchBox;

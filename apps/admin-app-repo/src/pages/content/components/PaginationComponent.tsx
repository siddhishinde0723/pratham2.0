import React, { useEffect } from "react";
import { Pagination, Box } from "@mui/material";
import { useRouter } from "next/router";

interface PaginationComponentProps {
    count: number;
    page: number;
    onPageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
    setPage?: any;
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({
    count,
    page,
    onPageChange,
    setPage,
}) => {
    const router = useRouter();
    useEffect(() => {
        const currentPage = parseInt(router.query.page as string, 10);
        if (currentPage && currentPage > 0) {
            setPage(currentPage - 1);
        } else {
            setPage(0); // Default to page 1 if the page param is invalid or missing
        }
    }, [router.query.page]);

    const handlePageChange = (
        event: React.ChangeEvent<unknown>,
        value: number
    ) => {
        // Call the provided onPageChange handler
        onPageChange(event, value);

        // Update the URL query with the new page number
        router.push(
            {
                pathname: router.pathname,
                query: { ...router.query, page: value }, // Add or update the page query parameter
            },
            undefined,
            { shallow: true } // Use shallow routing to avoid page reload
        );
    };

    return (
        <Box
            display="flex"
            className="pagination-bottom"
            justifyContent="end"
            mt={2}
        >
            <Pagination
                count={count}
                page={page + 1}
                color="primary"
                onChange={handlePageChange}
                sx={{
                    "& .Mui-selected": {
                        backgroundColor: "#FDBE16 !important",
                    },
                }}
            />
        </Box>
    );
};

export default PaginationComponent;

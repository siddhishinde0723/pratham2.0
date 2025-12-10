// @ts-nocheck
// import React, { useState, useEffect } from 'react';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   Paper,
//   IconButton,
// } from '@mui/material';

// const PaginatedTable = ({
//   count,
//   data,
//   columns,
//   actions,
//   rowsPerPageOptions = [5, 10, 15],
//   defaultPage = 0,
//   defaultRowsPerPage = 5,
//   onPageChange,
//   onRowsPerPageChange,
// }) => {
//   const [page, setPage] = useState(defaultPage);
//   const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

//   console.log('data', data);

//   useEffect(() => {
//     setPage(defaultPage);
//   }, [defaultPage]);

//   useEffect(() => {
//     setRowsPerPage(defaultRowsPerPage);
//   }, [defaultRowsPerPage]);

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//     if (onPageChange) onPageChange(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     const newRowsPerPage = parseInt(event.target.value, 10);
//     setRowsPerPage(newRowsPerPage);
//     setPage(0);
//     if (onRowsPerPageChange) onRowsPerPageChange(newRowsPerPage);
//   };

//   const paginatedData = data;

//   return (
//     <Paper>
//       <TableContainer>
//         <Table>
//           <TableHead>
//             <TableRow>
//               {columns.map((col) => (
//                 <TableCell key={col.key}>{col.label}</TableCell>
//               ))}
//               <TableCell>Actions</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {paginatedData.map((row, index) => (
//               <TableRow key={index}>
//                 {columns.map((col) => (
//                   <TableCell
//                     key={col.key}
//                     style={col.getStyle ? col.getStyle(row) : {}}
//                   >
//                     {col.render ? col.render(row) : row[col.key] || '-'}
//                   </TableCell>
//                 ))}
//                 <TableCell>
//                   {actions.map((action, idx) => (
//                     <IconButton key={idx} onClick={() => action.callback(row)}>
//                       {action.icon}
//                     </IconButton>
//                   ))}
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>
//       <TablePagination
//         rowsPerPageOptions={rowsPerPageOptions}
//         component="div"
//         count={count}
//         rowsPerPage={rowsPerPage}
//         page={page}
//         onPageChange={handleChangePage}
//         onRowsPerPageChange={handleChangeRowsPerPage}
//       />
//     </Paper>
//   );
// };

// export default PaginatedTable;

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Box,
} from '@mui/material';

const PaginatedTable = ({
  count,
  data,
  columns,
  actions = [],
  rowsPerPageOptions = [5, 10, 15],
  defaultPage = 0,
  defaultRowsPerPage = 5,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const [page, setPage] = useState(defaultPage);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  useEffect(() => {
    setPage(defaultPage);
  }, [defaultPage]);

  useEffect(() => {
    setRowsPerPage(defaultRowsPerPage);
  }, [defaultRowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    if (onPageChange) onPageChange(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    if (onRowsPerPageChange) onRowsPerPageChange(newRowsPerPage);
  };

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns?.map((col) => (
                <TableCell key={col.key || col.keys?.join('-')}>
                  {col.label}
                </TableCell>
              ))}
              {actions.length > 0 && <TableCell>Archive User</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {data &&
              data?.map((row, index) => (
                <TableRow key={index}>
                  {columns?.map((col) => (
                    <TableCell key={col.key || col.keys?.join('-')}>
                      {/* ✅ Keep custom render logic if provided */}
                      {col.render
                        ? col.render(row)
                        : Array.isArray(col.keys)
                        ? col.keys.map((key) => row[key] ?? '').join(' ')
                        : row[col.key] ?? ''}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell sx={{ width: '100px' }}>
                      {actions.map((action, idx) => (
                        <IconButton
                          key={idx}
                          onClick={() => action.callback(row)}
                        >
                          {typeof action.icon === 'function'
                            ? action.icon(row)
                            : action.icon}
                        </IconButton>
                      ))}
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={count}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default PaginatedTable;

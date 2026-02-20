import React from "react";
import {
    Dialog,
    DialogActions,
    DialogTitle,
    Button,
    Typography,
    Box,
    Divider,
} from "@mui/material";
import { deleteContent } from "@/services/ContentService";
import { toast } from "react-hot-toast";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface DeleteConfirmationProps {
    open: boolean;
    handleClose: () => void;
    rowData?: any;
    onDeleteSuccess?: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
    open,
    rowData,
    handleClose,
    onDeleteSuccess,
}) => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const handleDelete = async () => {
        if (rowData?.identifier && rowData?.mimeType) {
            try {
                await deleteContent(rowData?.identifier, rowData?.mimeType);

                await delay(1000);
                toast.success("Content Deleted Successfully", {
                    icon: <CheckCircleIcon style={{ color: "white" }} />,
                    style: {
                        backgroundColor: "green",
                        color: "white",
                    },
                    position: "bottom-center",
                });

                if (onDeleteSuccess) {
                    onDeleteSuccess();
                }
            } catch (error) {
                console.error("Failed to delete content:", error);
                toast.error("Failed to delete content");
            }
        }
        handleClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="delete-confirmation-title"
            maxWidth="xs"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: "16px",
                },
            }}
        >
            <DialogTitle sx={{ m: 0, }} id="delete-confirmation-title">
                <Box sx={{ padding: '10px' }}>
                    <Typography sx={{ fontWeight: "400", fontSize: "16px" }}>Are you sure you want to delete this Resource?</Typography>
                </Box>
            </DialogTitle>
            <Divider />

            <DialogActions sx={{ justifyContent: "end", gap: '10px', padding: '20px' }}>
                <Box onClick={handleClose} sx={{ cursor: "pointer", color: "#0D599E", fontSize: '14px', }}>
                    No, go back
                </Box>
                <Button sx={{
                    background: '#FDBE16',
                    color: '#000',
                    borderRadius: '100px',
                    '&:hover': {
                        background: '#FDBE16',
                    },
                }} onClick={handleDelete} variant="contained">
                    Yes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteConfirmation;

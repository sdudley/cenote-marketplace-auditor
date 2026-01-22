import React, { useState, useEffect } from 'react';
import {
    TablePagination,
    CircularProgress,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Snackbar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    FormHelperText,
} from '@mui/material';
import { Delete as DeleteIcon, LockReset as LockResetIcon, Add as AddIcon } from '@mui/icons-material';
import { StyledTableContainer, TableWrapper, LoadingOverlay, TableContainer, StyledTable, StyledTableHead, StyledTableBody, PaginationWrapper } from '../../components/styles';
import { StyledTableRow, StyledListPaper, StyledTableCell, TableHeaderCell } from '../../components/styles';
import { UserType } from '../../util/userUtils';
import { validatePassword, validatePasswordLength, getPasswordHelperText } from '../../util/passwordValidation';

interface User {
    id: string;
    email: string;
    userType: string;
    createdAt: string;
    updatedAt: string;
}

interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    pageSize: number;
}

export const UserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createUserType, setCreateUserType] = useState<string>(UserType.User);
    const [createPassword, setCreatePassword] = useState('');
    const [createConfirmPassword, setCreateConfirmPassword] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        fetchCurrentUser();
        fetchUsers();
    }, [page, rowsPerPage]);

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('/api/auth/status', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    setCurrentUserId(data.user.id);
                }
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/users?page=${page}&pageSize=${rowsPerPage}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data: UserListResponse = await response.json();
                setUsers(data.users);
                setTotal(data.total);
            } else {
                setSnackbar({
                    open: true,
                    message: 'Failed to fetch users',
                    severity: 'error',
                });
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setSnackbar({
                open: true,
                message: 'Error fetching users',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/users/${selectedUser.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                setSnackbar({
                    open: true,
                    message: 'User deleted successfully',
                    severity: 'success',
                });
                setDeleteDialogOpen(false);
                setSelectedUser(null);
                fetchUsers();
            } else {
                const data = await response.json();
                setSnackbar({
                    open: true,
                    message: data.error || 'Failed to delete user',
                    severity: 'error',
                });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            setSnackbar({
                open: true,
                message: 'Error deleting user',
                severity: 'error',
            });
        }
    };

    const handleResetPasswordClick = (user: User) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setResetPasswordDialogOpen(true);
    };

    const handleResetPasswordConfirm = async () => {
        if (!selectedUser) return;

        const passwordValidation = validatePassword(newPassword, confirmPassword);
        if (!passwordValidation.isValid) {
            setSnackbar({
                open: true,
                message: passwordValidation.error!,
                severity: 'error',
            });
            return;
        }

        try {
            const response = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ newPassword }),
            });

            if (response.ok) {
                setSnackbar({
                    open: true,
                    message: 'Password reset successfully',
                    severity: 'success',
                });
                setResetPasswordDialogOpen(false);
                setSelectedUser(null);
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await response.json();
                setSnackbar({
                    open: true,
                    message: data.error || 'Failed to reset password',
                    severity: 'error',
                });
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            setSnackbar({
                open: true,
                message: 'Error resetting password',
                severity: 'error',
            });
        }
    };

    const handleCreateUserClick = () => {
        setCreateEmail('');
        setCreateUserType(UserType.User);
        setCreatePassword('');
        setCreateConfirmPassword('');
        setCreateUserDialogOpen(true);
    };

    const handleCreateUserConfirm = async () => {
        if (!createEmail) {
            setSnackbar({
                open: true,
                message: 'Email is required',
                severity: 'error',
            });
            return;
        }

        const passwordValidation = validatePassword(createPassword, createConfirmPassword);
        if (!passwordValidation.isValid) {
            setSnackbar({
                open: true,
                message: passwordValidation.error!,
                severity: 'error',
            });
            return;
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: createEmail,
                    userType: createUserType,
                    password: createPassword,
                    confirmPassword: createConfirmPassword,
                }),
            });

            if (response.ok) {
                setSnackbar({
                    open: true,
                    message: 'User created successfully',
                    severity: 'success',
                });
                setCreateUserDialogOpen(false);
                setCreateEmail('');
                setCreateUserType(UserType.User);
                setCreatePassword('');
                setCreateConfirmPassword('');
                fetchUsers();
            } else {
                const data = await response.json();
                setSnackbar({
                    open: true,
                    message: data.error || 'Failed to create user',
                    severity: 'error',
                });
            }
        } catch (error) {
            console.error('Error creating user:', error);
            setSnackbar({
                open: true,
                message: 'Error creating user',
                severity: 'error',
            });
        }
    };

    return (
        <TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateUserClick}
                >
                    Create User
                </Button>
            </Box>
            <TableWrapper>
                <StyledTableContainer>
                    <StyledListPaper>
                        <StyledTable>
                            <StyledTableHead>
                                <StyledTableRow>
                                    <TableHeaderCell>Email</TableHeaderCell>
                                    <TableHeaderCell>Access Level</TableHeaderCell>
                                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                                </StyledTableRow>
                            </StyledTableHead>
                            <StyledTableBody>
                                {loading ? (
                                    <StyledTableRow>
                                        <StyledTableCell colSpan={3}>
                                            <LoadingOverlay>
                                                <CircularProgress />
                                            </LoadingOverlay>
                                        </StyledTableCell>
                                    </StyledTableRow>
                                ) : users.length === 0 ? (
                                    <StyledTableRow>
                                        <StyledTableCell colSpan={3} align="center">
                                            No users found
                                        </StyledTableCell>
                                    </StyledTableRow>
                                ) : (
                                    users.map((user) => (
                                        <StyledTableRow key={user.id}>
                                            <StyledTableCell>{user.email}</StyledTableCell>
                                            <StyledTableCell>
                                                {user.userType === UserType.Admin ? 'Administrator' : 'User'}
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleResetPasswordClick(user)}
                                                    title="Reset Password"
                                                >
                                                    <LockResetIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteClick(user)}
                                                    disabled={user.id === currentUserId}
                                                    title={user.id === currentUserId ? 'Cannot delete your own account' : 'Delete User'}
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </StyledTableCell>
                                        </StyledTableRow>
                                    ))
                                )}
                            </StyledTableBody>
                        </StyledTable>
                    </StyledListPaper>
                </StyledTableContainer>
            </TableWrapper>

            <PaginationWrapper>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            </PaginationWrapper>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete user <strong>{selectedUser?.email}</strong>? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent>
                    <TextField
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        helperText={getPasswordHelperText()}
                    />
                    <TextField
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Resetting password for user: <strong>{selectedUser?.email}</strong>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetPasswordDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleResetPasswordConfirm} variant="contained" disabled={!newPassword || !confirmPassword}>
                        Reset Password
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create User Dialog */}
            <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create User</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Email"
                        type="email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        autoComplete="email"
                    />
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>User Type</InputLabel>
                        <Select
                            value={createUserType}
                            label="User Type"
                            onChange={(e) => setCreateUserType(e.target.value)}
                        >
                            <MenuItem value={UserType.User}>User</MenuItem>
                            <MenuItem value={UserType.Admin}>Administrator</MenuItem>
                        </Select>
                        <FormHelperText>Regular users can only view transactions and licenses, without the ability to modify settings. Administrators can run tasks and modify the configuration.</FormHelperText>
                    </FormControl>
                    <TextField
                        label="Password"
                        type="password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        autoComplete="new-password"
                        helperText={getPasswordHelperText()}
                    />
                    <TextField
                        label="Confirm Password"
                        type="password"
                        value={createConfirmPassword}
                        onChange={(e) => setCreateConfirmPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                        autoComplete="new-password"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateUserDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleCreateUserConfirm}
                        variant="contained"
                        disabled={!createEmail || !createPassword || !createConfirmPassword}
                    >
                        Create User
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </TableContainer>
    );
};


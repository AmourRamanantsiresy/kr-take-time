import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import { api } from '../../api/client';
import { AdminUser } from '../../api/types';
import { formatDuration } from '../../utils/format';
import { AdminUsersStyle } from './style';

export const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantMinutes, setGrantMinutes] = useState('60');
  const [grantDevices, setGrantDevices] = useState('');

  const refresh = async (q = query) => {
    try {
      setUsers(await api.get<AdminUser[]>(`/api/admin/users?q=${encodeURIComponent(q)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  };

  useEffect(() => {
    refresh('');
  }, []);

  const grant = async () => {
    if (!grantTarget) return;
    setError('');
    try {
      await api.post(`/api/admin/users/${grantTarget.id}/grant`, {
        minutes: parseInt(grantMinutes, 10),
        ...(grantDevices ? { device_limit: parseInt(grantDevices, 10) } : {}),
      });
      setGrantTarget(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grant failed');
    }
  };

  return (
    <Box sx={AdminUsersStyle}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">Users</Typography>
      <TextField
        className="users-search"
        label="Search username"
        size="small"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          refresh(e.target.value);
        }}
      />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Device limit</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{formatDuration(Number(user.remaining_seconds))}</TableCell>
                <TableCell>{user.device_limit}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MoreTimeIcon />}
                    onClick={() => setGrantTarget(user)}
                  >
                    Grant time
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!grantTarget} onClose={() => setGrantTarget(null)}>
        <DialogTitle>Grant time to {grantTarget?.username}</DialogTitle>
        <DialogContent>
          <TextField
            label="Minutes"
            type="number"
            fullWidth
            margin="normal"
            value={grantMinutes}
            onChange={(e) => setGrantMinutes(e.target.value)}
          />
          <TextField
            label="Raise device limit to (optional)"
            type="number"
            fullWidth
            margin="normal"
            value={grantDevices}
            onChange={(e) => setGrantDevices(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={grant}>
            Grant
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

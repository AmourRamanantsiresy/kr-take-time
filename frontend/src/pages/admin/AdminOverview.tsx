import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import { api } from '../../api/client';
import { ActiveSession, PlanRequest } from '../../api/types';
import { formatDate, formatDuration } from '../../utils/format';
import { AdminOverviewStyle } from './style';

export const AdminOverview = () => {
  const [pending, setPending] = useState<PlanRequest[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const [p, s] = await Promise.all([
        api.get<PlanRequest[]>('/api/admin/requests'),
        api.get<ActiveSession[]>('/api/admin/sessions/active'),
      ]);
      setPending(p);
      setSessions(s);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview');
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10_000);
    return () => clearInterval(timer);
  }, []);

  const decide = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/api/admin/requests/${id}/${action}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const kick = async (mac: string) => {
    try {
      await api.post(`/api/admin/sessions/${encodeURIComponent(mac)}/kick`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kick failed');
    }
  };

  return (
    <Box sx={AdminOverviewStyle}>
      {error && <Alert severity="error">{error}</Alert>}

      <Box>
        <Typography className="section-title" variant="h6">
          Pending plan requests
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell align="right">Decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="empty-hint">
                    Nothing pending
                  </TableCell>
                </TableRow>
              )}
              {pending.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>Client N° {request.username}</TableCell>
                  <TableCell>
                    {request.plan_name
                      ? `${request.plan_name} (${request.duration_minutes} min, ${request.device_limit} dev)`
                      : `${request.requested_minutes} min (custom)`}
                  </TableCell>
                  <TableCell>{request.price ?? '—'}</TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => decide(request.id, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={() => decide(request.id, 'reject')}
                      >
                        Reject
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Typography className="section-title" variant="h6">
          Active sessions
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>MAC</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Consumed</TableCell>
                <TableCell>Balance left</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="empty-hint">
                    No one is online
                  </TableCell>
                </TableRow>
              )}
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.username}</TableCell>
                  <TableCell>{session.device_mac}</TableCell>
                  <TableCell>{session.ip}</TableCell>
                  <TableCell>{formatDate(session.started_at)}</TableCell>
                  <TableCell>{formatDuration(Number(session.seconds_consumed))}</TableCell>
                  <TableCell>{formatDuration(Number(session.remaining_seconds))}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<PowerOffIcon />}
                      onClick={() => kick(session.device_mac)}
                    >
                      Kick
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

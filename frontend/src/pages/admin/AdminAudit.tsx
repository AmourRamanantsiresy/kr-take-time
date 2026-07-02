import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { api } from '../../api/client';
import { AuditEntry } from '../../api/types';
import { formatDate } from '../../utils/format';
import { AdminAuditStyle } from './style';

export const AdminAudit = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<AuditEntry[]>('/api/admin/audit')
      .then(setEntries)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load audit log'),
      );
  }, []);

  return (
    <Box sx={AdminAuditStyle}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">Audit log</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDate(entry.created_at)}</TableCell>
                <TableCell>{entry.actor_username ?? 'system'}</TableCell>
                <TableCell>{entry.action}</TableCell>
                <TableCell>{entry.target ?? '—'}</TableCell>
                <TableCell className="audit-meta">
                  {JSON.stringify(entry.meta)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '../../api/client';
import { Voucher } from '../../api/types';
import { formatDate } from '../../utils/format';
import { AdminVouchersStyle } from './style';

const statusColor = (status: Voucher['status']) =>
  status === 'unused' ? 'success' : status === 'redeemed' ? 'default' : 'warning';

const toCsv = (vouchers: Voucher[]): string => {
  const header = 'code,duration_minutes,device_limit,status,expires_at';
  const lines = vouchers.map(
    (v) =>
      `${v.code},${v.duration_minutes},${v.device_limit},${v.status},${v.expires_at ?? ''}`,
  );
  return [header, ...lines].join('\n');
};

export const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [error, setError] = useState('');
  const [count, setCount] = useState('10');
  const [minutes, setMinutes] = useState('60');
  const [deviceLimit, setDeviceLimit] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [lastBatch, setLastBatch] = useState<Voucher[]>([]);

  const refresh = async () => {
    try {
      setVouchers(await api.get<Voucher[]>('/api/admin/vouchers'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const batch = await api.post<Voucher[]>('/api/admin/vouchers/generate', {
        count: parseInt(count, 10),
        duration_minutes: parseInt(minutes, 10),
        device_limit: parseInt(deviceLimit, 10),
        ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
      });
      setLastBatch(batch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
  };

  const exportCsv = () => {
    const source = lastBatch.length > 0 ? lastBatch : vouchers;
    const blob = new Blob([toCsv(source)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vouchers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={AdminVouchersStyle}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">Vouchers</Typography>
      <Paper className="vouchers-form" component="form" onSubmit={generate}>
        <TextField
          label="Count"
          size="small"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          required
        />
        <TextField
          label="Minutes each"
          size="small"
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          required
        />
        <TextField
          label="Device limit"
          size="small"
          type="number"
          value={deviceLimit}
          onChange={(e) => setDeviceLimit(e.target.value)}
          required
        />
        <TextField
          label="Expires (optional)"
          size="small"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />}>
          Generate
        </Button>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
          Print
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={exportCsv}>
          CSV
        </Button>
      </Paper>
      <Typography className="vouchers-list-title" variant="subtitle2">
        {lastBatch.length > 0
          ? `Last generated batch: ${lastBatch.length} codes (also in the table below)`
          : 'All vouchers'}
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Minutes</TableCell>
              <TableCell>Devices</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Redeemed by</TableCell>
              <TableCell>Expires</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vouchers.map((voucher) => (
              <TableRow key={voucher.id}>
                <TableCell className="voucher-code">{voucher.code}</TableCell>
                <TableCell>{voucher.duration_minutes}</TableCell>
                <TableCell>{voucher.device_limit}</TableCell>
                <TableCell>
                  <Chip
                    label={voucher.status}
                    color={statusColor(voucher.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {voucher.redeemed_by_username ?? '—'}
                  {voucher.redeemed_at ? ` (${formatDate(voucher.redeemed_at)})` : ''}
                </TableCell>
                <TableCell>{voucher.expires_at ? formatDate(voucher.expires_at) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

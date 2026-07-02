import { FormEvent, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { api } from '../../api/client';
import { VoucherPageStyle } from './style';

interface RedeemResult {
  credited_minutes: number;
  device_limit: number;
}

export const VoucherPage = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [busy, setBusy] = useState(false);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const res = await api.post<RedeemResult>('/api/vouchers/redeem', {
        code: code.trim().toUpperCase(),
      });
      setResult(res);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redeem failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={VoucherPageStyle}>
      <Typography variant="h6">Redeem a voucher</Typography>
      <Paper className="voucher-card" component="form" onSubmit={redeem}>
        {error && <Alert severity="error">{error}</Alert>}
        {result && (
          <Alert severity="success">
            Credited {result.credited_minutes} minutes (up to{' '}
            {result.device_limit} device{result.device_limit > 1 ? 's' : ''}).
            Go to “My Time” and connect!
          </Alert>
        )}
        <TextField
          className="voucher-input"
          label="Voucher code"
          placeholder="XXXX-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<ConfirmationNumberIcon />}
          disabled={busy}
        >
          Redeem
        </Button>
      </Paper>
    </Box>
  );
};

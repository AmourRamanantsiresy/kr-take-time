import { FC, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../../api/client';
import { Plan, PlanRequest } from '../../api/types';
import { TimeRequestStyle } from './style';

interface TimeRequestProps {
  onCredited: () => void;
}

/* Pick a time (plan chip or custom minutes), submit, pay at the
   counter. While a request is pending we show a waiting banner; the
   parent polls the balance and flips to the online view the moment the
   admin approves. A voucher code skips the approval entirely. */
export const TimeRequest: FC<TimeRequestProps> = (props) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pending, setPending] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [voucher, setVoucher] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Plan[]>('/api/plans').then(setPlans).catch(() => undefined);
    api
      .get<PlanRequest[]>('/api/requests')
      .then((mine) => setPending(mine.some((r) => r.status === 'pending')))
      .catch(() => undefined);
  }, []);

  const request = async (body: { plan_id?: number; minutes?: number }) => {
    setError('');
    setBusy(true);
    try {
      await api.post('/api/requests', body);
      setPending(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const submitCustom = async () => {
    const minutes = parseInt(customMinutes, 10);
    if (!minutes || minutes < 5) {
      setError('Enter at least 5 minutes');
      return;
    }
    await request({ minutes });
  };

  const redeem = async () => {
    setError('');
    setBusy(true);
    try {
      await api.post('/api/vouchers/redeem', { code: voucher.trim().toUpperCase() });
      props.onCredited();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redeem failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={TimeRequestStyle}>
      <Typography className="time-title" variant="h6">
        How much time do you want?
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      {pending && (
        <Box className="waiting-box">
          <CircularProgress size={28} />
          <Typography>
            Pay at the counter — your time starts as soon as it's approved.
          </Typography>
        </Box>
      )}

      <Box className="time-chips">
        {plans.map((plan) => (
          <Chip
            key={plan.id}
            label={`${plan.duration_minutes} min · ${plan.price}`}
            color="primary"
            variant="outlined"
            disabled={busy}
            onClick={() => request({ plan_id: plan.id })}
          />
        ))}
      </Box>

      <TextField
        label="Or type the minutes you want"
        type="number"
        inputMode="numeric"
        value={customMinutes}
        onChange={(e) => setCustomMinutes(e.target.value)}
      />
      <Button variant="contained" size="large" disabled={busy} onClick={submitCustom}>
        {pending ? 'Change my request' : 'Request time'}
      </Button>

      <Typography className="status-caption" variant="body2" color="text.secondary">
        Have a voucher code?
      </Typography>
      <Box className="voucher-row">
        <TextField
          size="small"
          placeholder="XXXX-XXXX-XXXX"
          value={voucher}
          onChange={(e) => setVoucher(e.target.value)}
        />
        <Button variant="outlined" disabled={busy || voucher.trim().length < 4} onClick={redeem}>
          Redeem
        </Button>
      </Box>
    </Box>
  );
};

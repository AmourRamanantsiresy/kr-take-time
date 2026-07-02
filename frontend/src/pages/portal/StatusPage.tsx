import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import WifiIcon from '@mui/icons-material/Wifi';
import { api } from '../../api/client';
import { Balance, Device } from '../../api/types';
import { captureFasContext, loadFasContext } from '../../api/fasContext';
import { formatDuration } from '../../utils/format';
import { StatusPageStyle } from './style';

/* Live status dashboard: the countdown ticks locally every second and
   re-syncs with the server every 30s (the reconciler is authoritative).
   "Connect this device" replays the signed FAS context to
   /session/connect, which triggers the actual ndsctl authorization. */
export const StatusPage = () => {
  const [params] = useSearchParams();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [b, d] = await Promise.all([
        api.get<Balance>('/api/me/balance'),
        api.get<Device[]>('/api/me/devices'),
      ]);
      setBalance(b);
      setDevices(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    }
  }, []);

  useEffect(() => {
    captureFasContext(params);
    refresh();
    const sync = setInterval(refresh, 30_000);
    return () => clearInterval(sync);
  }, [params, refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      setBalance((prev) =>
        prev && prev.active_devices > 0
          ? {
              ...prev,
              remaining_seconds: Math.max(
                0,
                prev.remaining_seconds - prev.active_devices,
              ),
            }
          : prev,
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const connect = async () => {
    setError('');
    setNotice('');
    const ctx = loadFasContext();
    if (!ctx) {
      setError(
        'No connection context found. Close this page, reconnect to the Wi-Fi, and let the portal open by itself.',
      );
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/session/connect', { ...ctx });
      setNotice('You are online! The timer is running.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={StatusPageStyle}>
      <Paper className="status-card">
        <Typography className="status-caption" variant="overline">
          Remaining time
        </Typography>
        <Typography className="status-countdown" variant="h3">
          {balance ? formatDuration(balance.remaining_seconds) : '--:--:--'}
        </Typography>
        <Typography className="status-caption" variant="body2">
          {balance
            ? `${balance.active_devices} of ${balance.device_limit} devices online`
            : ''}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {notice && <Alert severity="success">{notice}</Alert>}
        <Button
          variant="contained"
          size="large"
          startIcon={<WifiIcon />}
          onClick={connect}
          disabled={busy || !balance || balance.remaining_seconds <= 0}
        >
          Connect this device
        </Button>
      </Paper>

      <Typography className="devices-title" variant="subtitle1">
        Your devices
      </Typography>
      <Paper>
        <List dense>
          {devices.length === 0 && (
            <ListItem>
              <ListItemText primary="No devices yet" />
            </ListItem>
          )}
          {devices.map((device) => (
            <ListItem
              key={device.id}
              secondaryAction={
                device.online ? (
                  <Chip label="online" color="success" size="small" />
                ) : (
                  <Chip label="offline" size="small" />
                )
              }
            >
              <ListItemIcon>
                <DevicesIcon />
              </ListItemIcon>
              <ListItemText
                primary={device.label || device.mac}
                secondary={device.label ? device.mac : undefined}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

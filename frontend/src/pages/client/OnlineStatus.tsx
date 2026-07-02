import { FC, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import { api } from '../../api/client';
import { Balance } from '../../api/types';
import { loadFasContext } from '../../api/fasContext';
import { formatDuration } from '../../utils/format';
import { OnlineStatusStyle } from './style';

interface OnlineStatusProps {
  balance: Balance;
  onRefresh: () => void;
}

/* Big live countdown. If this device arrived through the captive
   portal (signed FAS context present) and isn't online yet, we
   authorize it automatically once — the button stays as fallback. */
export const OnlineStatus: FC<OnlineStatusProps> = (props) => {
  const [display, setDisplay] = useState(props.balance.remaining_seconds);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  useEffect(() => {
    setDisplay(props.balance.remaining_seconds);
  }, [props.balance.remaining_seconds]);

  useEffect(() => {
    const drainPerSecond = Math.max(1, props.balance.active_devices);
    const tick = setInterval(() => {
      setDisplay((prev) =>
        props.balance.active_devices > 0 ? Math.max(0, prev - drainPerSecond) : prev,
      );
    }, 1000);
    return () => clearInterval(tick);
  }, [props.balance.active_devices]);

  const connect = async () => {
    const ctx = loadFasContext();
    if (!ctx) {
      setError(
        'Reconnect to the Wi-Fi and let this page open by itself, then try again.',
      );
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.post('/api/session/connect', { ...ctx });
      setConnected(true);
      props.onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!autoTried.current && props.balance.active_devices === 0 && loadFasContext()) {
      autoTried.current = true;
      connect();
    }
  }, [props.balance.active_devices]);

  const online = connected || props.balance.active_devices > 0;

  return (
    <Box sx={OnlineStatusStyle}>
      <Typography className="status-caption" variant="overline">
        Remaining time
      </Typography>
      <Typography className="status-countdown">{formatDuration(display)}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {online ? (
        <Alert severity="success" icon={<WifiIcon />}>
          You are online — enjoy!
        </Alert>
      ) : (
        <Button
          variant="contained"
          size="large"
          startIcon={<WifiIcon />}
          disabled={busy}
          onClick={connect}
        >
          Connect this device
        </Button>
      )}
    </Box>
  );
};

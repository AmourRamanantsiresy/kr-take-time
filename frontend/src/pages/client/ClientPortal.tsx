import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { Balance } from '../../api/types';
import { captureFasContext } from '../../api/fasContext';
import { NumberEntry } from './NumberEntry';
import { TimeRequest } from './TimeRequest';
import { OnlineStatus } from './OnlineStatus';
import { ClientPortalStyle } from './style';

/* The whole customer journey on one screen (also served at /remain):
   enter your client number → ask for time (pay at the counter) or
   redeem a voucher → the balance poll flips the view to the live
   countdown the moment time is credited, and the device is authorized
   automatically. */
export const ClientPortal = () => {
  const { user, loading, clientLogin, logout } = useAuth();
  const [params] = useSearchParams();
  const [balance, setBalance] = useState<Balance | null>(null);

  useEffect(() => {
    captureFasContext(params);
  }, [params]);

  const refresh = useCallback(async () => {
    try {
      setBalance(await api.get<Balance>('/api/me/balance'));
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    refresh();
    const poll = setInterval(refresh, 5_000);
    return () => clearInterval(poll);
  }, [user, refresh]);

  const enter = async (number: number) => {
    await clientLogin(number);
  };

  const switchNumber = async () => {
    setBalance(null);
    await logout();
  };

  const isCustomer = user?.role === 'customer';

  return (
    <Box sx={ClientPortalStyle}>
      <Typography className="portal-brand" variant="h5">
        Cyber Café
      </Typography>
      <Paper className="portal-card">
        {loading && <CircularProgress className="portal-spinner" />}
        {!loading && !isCustomer && <NumberEntry onSubmit={enter} />}
        {!loading && isCustomer && (
          <>
            <Typography className="status-caption" variant="subtitle2" color="text.secondary">
              Client N° {user!.username}
            </Typography>
            {!balance && <CircularProgress className="portal-spinner" />}
            {balance && balance.remaining_seconds > 0 && (
              <OnlineStatus balance={balance} onRefresh={refresh} />
            )}
            {balance && balance.remaining_seconds <= 0 && (
              <TimeRequest onCredited={refresh} />
            )}
            <Button size="small" onClick={switchNumber}>
              Not you? Switch client number
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

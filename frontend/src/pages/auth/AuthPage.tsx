import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import { useAuth } from '../../auth/AuthContext';
import { captureFasContext } from '../../api/fasContext';
import { AuthPageStyle } from './style';

/* Landing screen of the captive-portal loop. If OpenNDS redirected us
   here, the signed client context rides in the query string — capture
   it before anything else so it survives the login round-trip. */
export const AuthPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    captureFasContext(params);
  }, [params]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const action = tab === 0 ? login : register;
      const user = await action(username.trim(), password);
      navigate(user.role === 'admin' ? '/admin' : '/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={AuthPageStyle}>
      <Paper className="auth-card" component="form" onSubmit={submit}>
        <Typography className="auth-title" variant="h5">
          <WifiIcon fontSize="small" /> Cyber Café
        </Typography>
        <Typography className="auth-subtitle" variant="body2">
          Log in to get online
        </Typography>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth">
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={tab === 0 ? 'current-password' : 'new-password'}
          required
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {tab === 0 ? 'Login' : 'Create account'}
        </Button>
      </Paper>
    </Box>
  );
};

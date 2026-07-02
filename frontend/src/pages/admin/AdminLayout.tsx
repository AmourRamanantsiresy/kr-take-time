import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../auth/AuthContext';
import { AdminLayoutStyle } from './style';

const TAB_PATHS = ['/admin', '/admin/plans', '/admin/vouchers', '/admin/users', '/admin/audit'];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const current = Math.max(0, TAB_PATHS.indexOf(location.pathname));

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={AdminLayoutStyle}>
      <AppBar position="static">
        <Toolbar>
          <Typography className="admin-title" variant="h6">
            Cyber Café — Admin
          </Typography>
          <Typography className="admin-whoami" variant="body2">
            {user?.username}
          </Typography>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={onLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box className="admin-content">
        <Tabs
          className="admin-tabs"
          value={current}
          onChange={(_e, v) => navigate(TAB_PATHS[v])}
          variant="scrollable"
        >
          <Tab label="Overview" />
          <Tab label="Plans" />
          <Tab label="Vouchers" />
          <Tab label="Users" />
          <Tab label="Audit" />
        </Tabs>
        <Outlet />
      </Box>
    </Box>
  );
};

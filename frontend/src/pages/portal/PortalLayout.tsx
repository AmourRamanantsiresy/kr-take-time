import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../auth/AuthContext';
import { PortalLayoutStyle } from './style';

export const PortalLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const current = ['/portal', '/portal/plans', '/portal/voucher'].indexOf(
    location.pathname,
  );

  const onNav = async (value: number) => {
    if (value === 0) navigate('/portal');
    if (value === 1) navigate('/portal/plans');
    if (value === 2) navigate('/portal/voucher');
    if (value === 3) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <Box sx={PortalLayoutStyle}>
      <Box className="portal-content">
        <Outlet />
      </Box>
      <Paper className="portal-nav" elevation={8}>
        <BottomNavigation
          showLabels
          value={current < 0 ? 0 : current}
          onChange={(_e, v) => onNav(v)}
        >
          <BottomNavigationAction label="My Time" icon={<TimerIcon />} />
          <BottomNavigationAction label="Plans" icon={<ShoppingCartIcon />} />
          <BottomNavigationAction label="Voucher" icon={<ConfirmationNumberIcon />} />
          <BottomNavigationAction label="Logout" icon={<LogoutIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

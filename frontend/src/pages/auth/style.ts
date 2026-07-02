import { SxProps } from '@mui/material';

export const AuthPageStyle: SxProps = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: 2,
  '& .auth-card': {
    width: '100%',
    maxWidth: 400,
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  '& .auth-title': {
    textAlign: 'center',
    fontWeight: 700,
  },
  '& .auth-subtitle': {
    textAlign: 'center',
    color: 'text.secondary',
    mb: 1,
  },
};

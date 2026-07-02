import { SxProps } from '@mui/material';

export const PortalLayoutStyle: SxProps = {
  minHeight: '100vh',
  pb: 9,
  '& .portal-content': {
    maxWidth: 560,
    mx: 'auto',
    px: 2,
    pt: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  '& .portal-nav': {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
};

export const StatusPageStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .status-card': {
    p: 3,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  '& .status-countdown': {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
  },
  '& .status-caption': {
    color: 'text.secondary',
  },
  '& .devices-title': {
    mt: 1,
    fontWeight: 600,
  },
};

export const PlansPageStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .plan-card': {
    p: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  '& .plan-name': {
    fontWeight: 600,
  },
  '& .plan-meta': {
    color: 'text.secondary',
  },
};

export const VoucherPageStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .voucher-card': {
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  '& .voucher-input input': {
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
};

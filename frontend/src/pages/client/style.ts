import { SxProps } from '@mui/material';

export const ClientPortalStyle: SxProps = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  px: 2,
  pt: 4,
  pb: 4,
  '& .portal-card': {
    width: '100%',
    maxWidth: 440,
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  '& .portal-brand': {
    textAlign: 'center',
    fontWeight: 700,
    mb: 1,
  },
};

export const NumberEntryStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .number-hint': {
    textAlign: 'center',
    color: 'text.secondary',
  },
  '& .number-input input': {
    textAlign: 'center',
    fontSize: 42,
    fontWeight: 700,
    py: 1,
  },
};

export const TimeRequestStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .time-title': {
    textAlign: 'center',
    fontWeight: 600,
  },
  '& .time-chips': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    justifyContent: 'center',
  },
  '& .time-chips .MuiChip-root': {
    fontSize: 16,
    py: 2.5,
    px: 0.5,
  },
  '& .waiting-box': {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    p: 2,
    borderRadius: 2,
    bgcolor: 'action.hover',
  },
  '& .voucher-row': {
    display: 'flex',
    gap: 1,
  },
  '& .voucher-row .MuiTextField-root': {
    flex: 1,
  },
};

export const OnlineStatusStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  textAlign: 'center',
  '& .status-countdown': {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 700,
    fontSize: 56,
    lineHeight: 1.1,
  },
  '& .status-caption': {
    color: 'text.secondary',
  },
};

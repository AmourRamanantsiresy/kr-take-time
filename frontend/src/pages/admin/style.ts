import { SxProps } from '@mui/material';

export const AdminLoginStyle: SxProps = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: 2,
  '& .login-card': {
    width: '100%',
    maxWidth: 380,
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  '& .login-title': {
    textAlign: 'center',
    fontWeight: 700,
  },
};

export const AdminLayoutStyle: SxProps = {
  minHeight: '100vh',
  '& .admin-title': {
    flexGrow: 1,
  },
  '& .admin-whoami': {
    mr: 2,
  },
  '& .admin-content': {
    maxWidth: 1100,
    mx: 'auto',
    px: 2,
    py: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  '& .admin-tabs': {
    borderBottom: 1,
    borderColor: 'divider',
  },
};

export const AdminOverviewStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  '& .section-title': {
    fontWeight: 600,
    mb: 1,
  },
  '& .empty-hint': {
    color: 'text.secondary',
    p: 2,
  },
};

export const AdminPlansStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .plans-form': {
    p: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'center',
  },
  '& .plans-form .MuiTextField-root': {
    minWidth: 140,
  },
};

export const AdminVouchersStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .vouchers-form': {
    p: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'center',
  },
  '& .vouchers-form .MuiTextField-root': {
    minWidth: 140,
  },
  '& .voucher-code': {
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  '@media print': {
    '& .vouchers-form, & .vouchers-list-title, & .MuiTabs-root': {
      display: 'none',
    },
  },
};

export const AdminUsersStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .users-search': {
    maxWidth: 320,
  },
};

export const AdminAuditStyle: SxProps = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '& .audit-meta': {
    fontFamily: 'monospace',
    fontSize: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: 'text.secondary',
  },
};

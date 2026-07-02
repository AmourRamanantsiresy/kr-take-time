import { Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { AppStyle } from './style';
import { useAuth } from './auth/AuthContext';
import { AuthPage } from './pages/auth/AuthPage';
import { PortalLayout } from './pages/portal/PortalLayout';
import { StatusPage } from './pages/portal/StatusPage';
import { PlansPage } from './pages/portal/PlansPage';
import { VoucherPage } from './pages/portal/VoucherPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminPlans } from './pages/admin/AdminPlans';
import { AdminVouchers } from './pages/admin/AdminVouchers';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAudit } from './pages/admin/AdminAudit';

export const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={AppStyle}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/portal" /> : <AuthPage />} />
      <Route path="/portal" element={user ? <PortalLayout /> : <Navigate to={`/login${window.location.search}`} />}>
        <Route index element={<StatusPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="voucher" element={<VoucherPage />} />
      </Route>
      <Route
        path="/admin"
        element={
          user?.role === 'admin' ? <AdminLayout /> : <Navigate to="/login" />
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="vouchers" element={<AdminVouchers />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>
      <Route path="*" element={<Navigate to="/portal" />} />
    </Routes>
  );
};

import { Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { AppStyle } from './style';
import { useAuth } from './auth/AuthContext';
import { ClientPortal } from './pages/client/ClientPortal';
import { AdminLogin } from './pages/admin/AdminLogin';
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
      <Route path="/portal" element={<ClientPortal />} />
      <Route path="/remain" element={<ClientPortal />} />
      <Route
        path="/admin/login"
        element={user?.role === 'admin' ? <Navigate to="/admin" /> : <AdminLogin />}
      />
      <Route
        path="/admin"
        element={user?.role === 'admin' ? <AdminLayout /> : <Navigate to="/admin/login" />}
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

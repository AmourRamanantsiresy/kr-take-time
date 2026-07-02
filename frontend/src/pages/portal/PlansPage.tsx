import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from '@mui/material';
import { api } from '../../api/client';
import { Plan, PlanRequest } from '../../api/types';
import { PlansPageStyle } from './style';

/* Cash flow: pick a plan, pay the admin at the counter, wait for the
   approval to land as balance. Pending requests are shown so the
   customer knows the admin still has to act. */
export const PlansPage = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = async () => {
    try {
      const [p, r] = await Promise.all([
        api.get<Plan[]>('/api/plans'),
        api.get<PlanRequest[]>('/api/requests'),
      ]);
      setPlans(p);
      setRequests(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const requestPlan = async (planId: number) => {
    setError('');
    setBusyId(planId);
    try {
      await api.post('/api/requests', { plan_id: planId });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusyId(null);
    }
  };

  const pendingPlanIds = new Set(
    requests.filter((r) => r.status === 'pending').map((r) => r.plan_id),
  );

  return (
    <Box sx={PlansPageStyle}>
      <Typography variant="h6">Time plans</Typography>
      <Typography variant="body2" color="text.secondary">
        Pick a plan, then pay at the counter. Your time is credited once the
        admin approves.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {plans.map((plan) => (
        <Paper key={plan.id} className="plan-card">
          <Box>
            <Typography className="plan-name">{plan.name}</Typography>
            <Typography className="plan-meta" variant="body2">
              {plan.duration_minutes} min · up to {plan.device_limit} device
              {plan.device_limit > 1 ? 's' : ''} · {plan.price}
            </Typography>
          </Box>
          {pendingPlanIds.has(plan.id) ? (
            <Chip label="pending approval" color="warning" />
          ) : (
            <Button
              variant="outlined"
              onClick={() => requestPlan(plan.id)}
              disabled={busyId === plan.id}
            >
              Request
            </Button>
          )}
        </Paper>
      ))}
    </Box>
  );
};

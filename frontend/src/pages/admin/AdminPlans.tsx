import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../../api/client';
import { Plan } from '../../api/types';
import { AdminPlansStyle } from './style';

export const AdminPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [price, setPrice] = useState('0');
  const [deviceLimit, setDeviceLimit] = useState('1');

  const refresh = async () => {
    try {
      setPlans(await api.get<Plan[]>('/api/admin/plans'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/api/admin/plans', {
        name,
        duration_minutes: parseInt(minutes, 10),
        price: parseFloat(price),
        device_limit: parseInt(deviceLimit, 10),
      });
      setName('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      await api.patch(`/api/admin/plans/${plan.id}`, { active: !plan.active });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const remove = async (plan: Plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await api.del(`/api/admin/plans/${plan.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <Box sx={AdminPlansStyle}>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">Plans</Typography>
      <Paper className="plans-form" component="form" onSubmit={create}>
        <TextField
          label="Name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label="Minutes"
          size="small"
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          required
        />
        <TextField
          label="Price"
          size="small"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <TextField
          label="Device limit"
          size="small"
          type="number"
          value={deviceLimit}
          onChange={(e) => setDeviceLimit(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" startIcon={<AddIcon />}>
          Add plan
        </Button>
      </Paper>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Minutes</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Device limit</TableCell>
              <TableCell>Active</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>{plan.duration_minutes}</TableCell>
                <TableCell>{plan.price}</TableCell>
                <TableCell>{plan.device_limit}</TableCell>
                <TableCell>
                  <Switch
                    checked={!!plan.active}
                    onChange={() => toggleActive(plan)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => remove(plan)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

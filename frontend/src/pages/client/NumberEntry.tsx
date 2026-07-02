import { FC, FormEvent, useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { NumberEntryStyle } from './style';

interface NumberEntryProps {
  onSubmit: (number: number) => Promise<void>;
}

export const NumberEntry: FC<NumberEntryProps> = (props) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const number = parseInt(value, 10);
    if (!number || number < 1) {
      setError('Enter your client number');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await props.onSubmit(number);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={NumberEntryStyle} component="form" onSubmit={submit}>
      <Typography className="number-hint">
        Enter your client number to get online
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        className="number-input"
        type="number"
        inputMode="numeric"
        placeholder="N°"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <Button type="submit" variant="contained" size="large" disabled={busy}>
        Continue
      </Button>
    </Box>
  );
};

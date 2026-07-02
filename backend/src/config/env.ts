/* Central typed access to environment variables. Fails fast on missing
   required values so misconfiguration surfaces at boot, not mid-request. */

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const optional = (name: string, fallback: string): string =>
  process.env[name] ?? fallback;

export const env = {
  dbHost: () => optional('DB_HOST', '127.0.0.1'),
  dbPort: () => parseInt(optional('DB_PORT', '5432'), 10),
  dbName: () => required('DB_NAME'),
  dbUser: () => required('DB_USER'),
  dbPass: () => required('DB_PASS'),
  jwtSecret: () => required('JWT_SECRET'),
  fasKey: () => required('FAS_KEY'),
  backendPort: () => parseInt(optional('BACKEND_PORT', '3000'), 10),
  ndsctlPath: () => optional('NDSCTL_PATH', '/usr/sbin/ndsctl'),
  conntrackPath: () => optional('CONNTRACK_PATH', '/usr/sbin/conntrack'),
  kickCooldownSeconds: () => parseInt(optional('KICK_COOLDOWN_SECONDS', '300'), 10),
  adminUser: () => required('ADMIN_USER'),
  adminPass: () => required('ADMIN_PASS'),
  clientCount: () => parseInt(optional('CLIENT_COUNT', '100'), 10),
  sessionTickSeconds: () => parseInt(optional('SESSION_TICK_SECONDS', '15'), 10),
  maxSessionSeconds: () => parseInt(optional('MAX_SESSION_SECONDS', '86400'), 10),
  isProduction: () => optional('NODE_ENV', 'development') === 'production',
};

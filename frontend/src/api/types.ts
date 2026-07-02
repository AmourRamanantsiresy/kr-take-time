export type UserRole = 'admin' | 'customer';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface Plan {
  id: number;
  name: string;
  duration_minutes: number;
  price: string;
  device_limit: number;
  active?: boolean;
}

export interface PlanRequest {
  id: number;
  user_id: number;
  plan_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  username?: string;
  plan_name?: string;
  duration_minutes?: number;
  price?: string;
  device_limit?: number;
}

export interface Balance {
  remaining_seconds: number;
  device_limit: number;
  active_devices: number;
}

export interface Device {
  id: number;
  mac: string;
  label: string | null;
  first_seen: string;
  last_seen: string;
  online: boolean;
}

export interface Session {
  id: number;
  device_mac: string;
  ip: string;
  started_at: string;
  ended_at: string | null;
  seconds_consumed: string;
  status: 'active' | 'ended' | 'kicked';
}

export interface ActiveSession {
  id: number;
  device_mac: string;
  ip: string;
  started_at: string;
  seconds_consumed: string;
  user_id: number;
  username: string;
  remaining_seconds: string;
  device_limit: number;
}

export interface Voucher {
  id: number;
  code: string;
  duration_minutes: number;
  device_limit: number;
  status: 'unused' | 'redeemed' | 'expired';
  created_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by_username?: string | null;
}

export interface AdminUser {
  id: number;
  username: string;
  role: UserRole;
  remaining_seconds: string;
  device_limit: number;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_user_id: number | null;
  actor_username: string | null;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface FasContext {
  clientip: string;
  clientmac: string;
  hid: string;
  sig: string;
}

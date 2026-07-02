export type UserRole = 'admin' | 'customer';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  remaining_seconds: string;
  device_limit: number;
  created_at: Date;
}

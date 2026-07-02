import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DbService } from '../db/db.service';
import { AuditService } from '../db/audit.service';
import { AuthUser, UserRow } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  register = async (username: string, password: string): Promise<AuthUser> => {
    const existing = await this.db.one<UserRow>(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    if (existing) throw new ConflictException('Username already taken');
    const hash = await argon2.hash(password);
    const user = await this.db.one<UserRow>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'customer') RETURNING *`,
      [username, hash],
    );
    await this.audit.log(user!.id, 'auth.register', `user:${user!.id}`, { username });
    return { id: user!.id, username: user!.username, role: user!.role };
  };

  login = async (username: string, password: string): Promise<AuthUser> => {
    const user = await this.db.one<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    await this.audit.log(user.id, 'auth.login', `user:${user.id}`, { username });
    return { id: user.id, username: user.username, role: user.role };
  };

  sign = async (user: AuthUser): Promise<string> =>
    this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role });
}

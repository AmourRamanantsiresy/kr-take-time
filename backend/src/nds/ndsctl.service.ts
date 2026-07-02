import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { env } from '../config/env';

const execFileAsync = promisify(execFile);

export interface NdsClient {
  mac: string;
  ip: string;
  state: string;
  token: string;
}

/* All privileged network operations go through here. The service user
   is only allowed `sudo ndsctl …` (scoped sudoers entry installed by
   install.sh) — nothing else runs with elevated rights.

   ndsctl auth takes the session timeout in MINUTES; 0 would mean "use
   the global default", so we always pass an explicit positive value
   computed from the account balance. */
@Injectable()
export class NdsctlService {
  private readonly logger = new Logger(NdsctlService.name);

  private run = async (...args: string[]): Promise<string> => {
    const { stdout } = await execFileAsync('sudo', [env.ndsctlPath(), ...args], {
      timeout: 10_000,
    });
    return stdout.trim();
  };

  auth = async (mac: string, timeoutSeconds: number): Promise<void> => {
    const minutes = Math.max(1, Math.ceil(timeoutSeconds / 60));
    await this.run('auth', mac, String(minutes));
    this.logger.log(`authorized ${mac} for ${minutes} min`);
  };

  deauth = async (mac: string): Promise<void> => {
    try {
      await this.run('deauth', mac);
      this.logger.log(`deauthorized ${mac}`);
    } catch (err) {
      this.logger.warn(`deauth ${mac} failed (already gone?): ${err}`);
    }
  };

  /* OpenNDS offloads authenticated flows to an nftables flowtable;
     offloaded flows bypass the forward chains, so ESTABLISHED
     connections survive a deauth until they close on their own. Killing
     the client's conntrack entries makes a kick/cutoff bite instantly.
     conntrack exits non-zero when nothing matched — that's fine. */
  flushConntrack = async (ip: string): Promise<void> => {
    if (!ip) return;
    try {
      await execFileAsync('sudo', [env.conntrackPath(), '-D', '-s', ip], {
        timeout: 10_000,
      });
      this.logger.log(`flushed conntrack for ${ip}`);
    } catch {
      return;
    }
  };

  /* Returns the currently-known clients from `ndsctl json`, normalized
     to lowercase MACs. Shape across opennds versions varies slightly,
     so parsing is defensive. */
  clients = async (): Promise<Map<string, NdsClient>> => {
    const raw = await this.run('json');
    const parsed = JSON.parse(raw);
    const clients = new Map<string, NdsClient>();
    const list = parsed.clients ?? {};
    for (const key of Object.keys(list)) {
      const c = list[key];
      const mac = String(c.mac ?? key).toLowerCase();
      clients.set(mac, {
        mac,
        ip: String(c.ip ?? ''),
        state: String(c.state ?? ''),
        token: String(c.token ?? c.hid ?? ''),
      });
    }
    return clients;
  };
}

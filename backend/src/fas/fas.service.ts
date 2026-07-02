import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

export interface FasClientContext {
  clientip: string;
  clientmac: string;
  hid: string;
  gatewayname: string;
  originurl: string;
}

/* OpenNDS (fas_secure_enabled 1) redirects unauthenticated clients to
   GET /fas?fas=<base64 blob>. The blob is a delimited key=value string
   containing hid (hashed client id), clientip, clientmac, etc.

   Because the browser itself carries that redirect, we re-sign the
   client context with our shared FAS_KEY (HMAC-SHA256) before handing
   it to the SPA. /session/connect later refuses any context whose
   signature does not verify — so internet can only be granted to a
   MAC/IP pair that genuinely arrived through the OpenNDS FAS loop. */
@Injectable()
export class FasService {
  decode = (fasParam: string): FasClientContext => {
    const decoded = Buffer.from(fasParam, 'base64').toString('utf8');
    const fields = new Map<string, string>();
    for (const part of decoded.split(/[,&]\s*/)) {
      const idx = part.indexOf('=');
      if (idx > 0) fields.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
    }
    const clientip = fields.get('clientip') ?? '';
    const clientmac = (fields.get('clientmac') ?? '').toLowerCase();
    const hid = fields.get('hid') ?? '';
    if (!clientip || !clientmac || !hid) {
      throw new BadRequestException('Malformed FAS request');
    }
    return {
      clientip,
      clientmac,
      hid,
      gatewayname: fields.get('gatewayname') ?? '',
      originurl: fields.get('originurl') ?? '',
    };
  };

  sign = (ctx: Pick<FasClientContext, 'clientip' | 'clientmac' | 'hid'>): string =>
    createHmac('sha256', env.fasKey())
      .update(`${ctx.clientip}|${ctx.clientmac}|${ctx.hid}`)
      .digest('hex');

  verify = (
    ctx: Pick<FasClientContext, 'clientip' | 'clientmac' | 'hid'>,
    sig: string,
  ): boolean => {
    const expected = Buffer.from(this.sign(ctx), 'hex');
    const given = Buffer.from(sig || '', 'hex');
    return expected.length === given.length && timingSafeEqual(expected, given);
  };
}

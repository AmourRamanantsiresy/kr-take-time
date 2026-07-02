import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { FasService } from './fas.service';

/* Entry point of the captive-portal loop. OpenNDS sends the client's
   browser here; we unpack the client context, sign it, and bounce the
   browser into the SPA with the signed context in the query string.
   This route lives OUTSIDE the /api prefix — its path must match the
   FasPath configured in opennds.conf. */
@Controller('fas')
export class FasController {
  constructor(private readonly fas: FasService) {}

  @Get()
  handle(@Query('fas') fasParam: string | undefined, @Res() res: Response) {
    if (!fasParam) throw new BadRequestException('Missing fas parameter');
    const ctx = this.fas.decode(fasParam);
    const sig = this.fas.sign(ctx);
    const params = new URLSearchParams({
      clientip: ctx.clientip,
      clientmac: ctx.clientmac,
      hid: ctx.hid,
      sig,
      gw: ctx.gatewayname,
      origin: ctx.originurl,
    });
    res.redirect(302, `/portal?${params.toString()}`);
  }
}

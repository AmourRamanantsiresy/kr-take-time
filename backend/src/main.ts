import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { env } from './config/env';

/* API lives under /api; /fas is excluded from the prefix because its
   path must match FasPath in opennds.conf exactly. Binds to loopback
   only — Caddy is the sole LAN-facing entry point. */
const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['fas'] });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(env.backendPort(), '127.0.0.1');
  console.log(`cybera-backend listening on 127.0.0.1:${env.backendPort()}`);
};

bootstrap();

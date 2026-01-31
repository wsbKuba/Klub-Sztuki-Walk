import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Wyłącz domyślny body parser dla webhooków Stripe
    bodyParser: false,
  });

  // Middleware do obsługi raw body dla webhooków Stripe
  // Stripe wymaga surowego body do weryfikacji sygnatury
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

  // Standardowy JSON parser dla pozostałych endpointów
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS - pozwól na połączenia z frontendu
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4321',
    credentials: true,
  });

  // Globalna walidacja DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend uruchomiony na porcie ${port}`);
}

bootstrap();

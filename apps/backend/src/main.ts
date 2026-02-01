import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function runSeed(dataSource: DataSource) {
  console.log('🌱 Uruchamiam seed danych...');

  const userRepo = dataSource.getRepository('User');
  const classTypeRepo = dataSource.getRepository('ClassType');
  const scheduleRepo = dataSource.getRepository('ClassSchedule');

  // 1. Admin
  const adminExists = await userRepo.findOne({ where: { email: 'admin@martial-arts.com' } });
  let admin;
  if (!adminExists) {
    const hash = await bcrypt.hash('Admin123!', 10);
    admin = await userRepo.save({
      email: 'admin@martial-arts.com',
      passwordHash: hash,
      firstName: 'Administrator',
      lastName: 'Systemu',
      role: 'ADMINISTRATOR',
      isActive: true,
    });
    console.log('✅ Utworzono ADMINISTRATOR');
  } else {
    admin = adminExists;
  }

  // 2. Trener
  const trenerExists = await userRepo.findOne({ where: { email: 'trener@martial-arts.com' } });
  let trener;
  if (!trenerExists) {
    const hash = await bcrypt.hash('Trener123!', 10);
    trener = await userRepo.save({
      email: 'trener@martial-arts.com',
      passwordHash: hash,
      firstName: 'Tomasz',
      lastName: 'Kowalski',
      role: 'TRENER',
      isActive: true,
    });
    console.log('✅ Utworzono TRENER');
  } else {
    trener = trenerExists;
  }

  // 3. Typy zajęć z Price ID ze Stripe
  const classTypes = [
    { name: 'Boks', description: 'Tradycyjny boks angielski.', monthlyPrice: 150, stripePriceId: 'price_1StTU8CXIchWN0YjY1dJ79cr' },
    { name: 'Kickboxing', description: 'Połączenie boksu z kopnięciami.', monthlyPrice: 180, stripePriceId: 'price_1StTUTCXIchWN0YjFQms0NF9' },
    { name: 'MMA', description: 'Mixed Martial Arts.', monthlyPrice: 200, stripePriceId: 'price_1StTUeCXIchWN0Yjr4R1PSnU' },
  ];

  const createdTypes: any[] = [];
  for (const ct of classTypes) {
    let existing = await classTypeRepo.findOne({ where: { name: ct.name } });
    if (!existing) {
      existing = await classTypeRepo.save(ct);
      console.log(`✅ Utworzono typ: ${ct.name}`);
    } else {
      // Zaktualizuj stripePriceId jeśli się zmienił
      if (existing.stripePriceId !== ct.stripePriceId) {
        await classTypeRepo.update(existing.id, { stripePriceId: ct.stripePriceId });
        existing.stripePriceId = ct.stripePriceId;
        console.log(`✅ Zaktualizowano stripePriceId dla: ${ct.name}`);
      }
    }
    createdTypes.push(existing);
  }

  // 4. Harmonogram
  const schedules = [
    { classTypeId: createdTypes[0]?.id, trainerId: trener?.id, dayOfWeek: 1, startTime: '18:00', endTime: '19:30' },
    { classTypeId: createdTypes[0]?.id, trainerId: trener?.id, dayOfWeek: 3, startTime: '18:00', endTime: '19:30' },
    { classTypeId: createdTypes[1]?.id, trainerId: trener?.id, dayOfWeek: 2, startTime: '19:00', endTime: '20:30' },
    { classTypeId: createdTypes[1]?.id, trainerId: trener?.id, dayOfWeek: 4, startTime: '19:00', endTime: '20:30' },
    { classTypeId: createdTypes[2]?.id, trainerId: trener?.id, dayOfWeek: 5, startTime: '18:00', endTime: '20:00' },
  ];

  for (const sch of schedules) {
    const exists = await scheduleRepo.findOne({
      where: { classTypeId: sch.classTypeId, dayOfWeek: sch.dayOfWeek, startTime: sch.startTime }
    });
    if (!exists) {
      await scheduleRepo.save({ ...sch, isActive: true });
    }
  }

  console.log('🎉 Seed zakończony!');
  console.log('📝 Loginy: admin@martial-arts.com / Admin123!, trener@martial-arts.com / Trener123!');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Wyłącz domyślny body parser dla webhooków Stripe
    bodyParser: false,
  });

  // Uruchom seed jeśli RUN_SEED=true
  if (process.env.RUN_SEED === 'true') {
    const dataSource = app.get(DataSource);
    await runSeed(dataSource);
  }

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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

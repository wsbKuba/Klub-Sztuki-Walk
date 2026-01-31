import { AppDataSource } from '../data-source';
import { User, UserRole } from '../../users/entities/user.entity';
import { ClassType } from '../../classes/entities/class-type.entity';
import { ClassSchedule } from '../../classes/entities/class-schedule.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  try {
    // Inicjalizuj połączenie z bazą
    await AppDataSource.initialize();
    console.log('✅ Połączenie z bazą danych nawiązane');

    const userRepository = AppDataSource.getRepository(User);
    const classTypeRepository = AppDataSource.getRepository(ClassType);
    const scheduleRepository = AppDataSource.getRepository(ClassSchedule);

    // 1. Utwórz konto ADMINISTRATOR
    const adminExists = await userRepository.findOne({ where: { email: 'admin@martial-arts.com' } });
    let admin: User;

    if (!adminExists) {
      const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
      admin = userRepository.create({
        email: 'admin@martial-arts.com',
        passwordHash: adminPasswordHash,
        firstName: 'Administrator',
        lastName: 'Systemu',
        role: UserRole.ADMINISTRATOR,
        isActive: true,
      });
      await userRepository.save(admin);
      console.log('✅ Utworzono konto ADMINISTRATOR (admin@martial-arts.com / Admin123!)');
    } else {
      admin = adminExists;
      console.log('⏭️  Konto ADMINISTRATOR już istnieje');
    }

    // 2. Utwórz konto TRENER
    const trenerExists = await userRepository.findOne({ where: { email: 'trener@martial-arts.com' } });
    let trener: User;

    if (!trenerExists) {
      const trenerPasswordHash = await bcrypt.hash('Trener123!', 10);
      trener = userRepository.create({
        email: 'trener@martial-arts.com',
        passwordHash: trenerPasswordHash,
        firstName: 'Tomasz',
        lastName: 'Kowalski',
        role: UserRole.TRENER,
        isActive: true,
      });
      await userRepository.save(trener);
      console.log('✅ Utworzono konto TRENER (trener@martial-arts.com / Trener123!)');
    } else {
      trener = trenerExists;
      console.log('⏭️  Konto TRENER już istnieje');
    }

    // 3. Utwórz 3 typy zajęć
    const classTypes = [
      { name: 'Boks', description: 'Tradycyjny boks angielski. Nauka techniki ciosów, pracy nóg i taktyki walki.', monthlyPrice: 150 },
      { name: 'Kickboxing', description: 'Połączenie boksu z kopnięciami. Kompleksowy trening całego ciała.', monthlyPrice: 180 },
      { name: 'MMA', description: 'Mixed Martial Arts - sztuki walki mieszane. Trening obejmuje striking, wrestling i grappling.', monthlyPrice: 200 },
    ];

    const createdClassTypes: ClassType[] = [];

    for (const ct of classTypes) {
      const exists = await classTypeRepository.findOne({ where: { name: ct.name } });
      if (!exists) {
        const classType = classTypeRepository.create(ct);
        const saved = await classTypeRepository.save(classType);
        createdClassTypes.push(saved);
        console.log(`✅ Utworzono typ zajęć: ${ct.name} (${ct.monthlyPrice} PLN/miesiąc)`);
      } else {
        createdClassTypes.push(exists);
        console.log(`⏭️  Typ zajęć ${ct.name} już istnieje`);
      }
    }

    // 4. Utwórz harmonogram zajęć
    const schedules = [
      // Boks: Poniedziałek 18:00-19:30, Środa 18:00-19:30
      { classType: createdClassTypes[0], trainer: trener, dayOfWeek: 1, startTime: '18:00', endTime: '19:30' },
      { classType: createdClassTypes[0], trainer: trener, dayOfWeek: 3, startTime: '18:00', endTime: '19:30' },

      // Kickboxing: Wtorek 19:00-20:30, Czwartek 19:00-20:30
      { classType: createdClassTypes[1], trainer: trener, dayOfWeek: 2, startTime: '19:00', endTime: '20:30' },
      { classType: createdClassTypes[1], trainer: trener, dayOfWeek: 4, startTime: '19:00', endTime: '20:30' },

      // MMA: Piątek 18:00-20:00
      { classType: createdClassTypes[2], trainer: trener, dayOfWeek: 5, startTime: '18:00', endTime: '20:00' },
    ];

    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

    for (const sch of schedules) {
      const exists = await scheduleRepository.findOne({
        where: {
          classTypeId: sch.classType.id,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
        },
      });

      if (!exists) {
        const schedule = scheduleRepository.create({
          classTypeId: sch.classType.id,
          trainerId: sch.trainer.id,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime,
          isActive: true,
        });
        await scheduleRepository.save(schedule);
        console.log(`✅ Utworzono termin: ${sch.classType.name} - ${dayNames[sch.dayOfWeek]} ${sch.startTime}-${sch.endTime}`);
      } else {
        console.log(`⏭️  Termin ${sch.classType.name} - ${dayNames[sch.dayOfWeek]} ${sch.startTime} już istnieje`);
      }
    }

    console.log('\n🎉 Seed zakończony pomyślnie!');
    console.log('\n📝 Dane logowania:');
    console.log('   ADMINISTRATOR: admin@martial-arts.com / Admin123!');
    console.log('   TRENER: trener@martial-arts.com / Trener123!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd podczas seed:', error);
    process.exit(1);
  }
}

seed();

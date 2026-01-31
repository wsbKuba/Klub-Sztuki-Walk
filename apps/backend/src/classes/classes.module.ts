import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassType } from './entities/class-type.entity';
import { ClassSchedule } from './entities/class-schedule.entity';
import { ClassCancellation } from './entities/class-cancellation.entity';
import { ClassesService } from './classes.service';
import { ClassesController, ScheduleController } from './classes.controller';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassType, ClassSchedule, ClassCancellation]),
    forwardRef(() => NewsModule),
  ],
  controllers: [ClassesController, ScheduleController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}

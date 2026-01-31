import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClassSchedule } from './class-schedule.entity';

@Entity('class_cancellations')
export class ClassCancellation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_schedule_id', type: 'uuid', nullable: false })
  classScheduleId: string;

  @Column({ type: 'date', nullable: false })
  date: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relacje
  @ManyToOne(() => ClassSchedule)
  @JoinColumn({ name: 'class_schedule_id' })
  classSchedule: ClassSchedule;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ClassType } from './class-type.entity';
import { User } from '../../users/entities/user.entity';

@Entity('class_schedules')
export class ClassSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_type_id', type: 'uuid', nullable: false })
  classTypeId: string;

  @Column({ name: 'trainer_id', type: 'uuid', nullable: false })
  trainerId: string;

  @Column({ name: 'day_of_week', type: 'int', nullable: false })
  dayOfWeek: number; // 0-6 (0 = Sunday)

  @Column({ name: 'start_time', type: 'time', nullable: false })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: false })
  endTime: string;

  @Column({ name: 'is_active', default: true, nullable: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacje
  @ManyToOne(() => ClassType)
  @JoinColumn({ name: 'class_type_id' })
  classType: ClassType;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'trainer_id' })
  trainer: User;

  // @OneToMany(() => ClassCancellation, (cancellation) => cancellation.classSchedule)
  // cancellations: ClassCancellation[];
}

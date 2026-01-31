import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('class_types')
export class ClassType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'monthly_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  monthlyPrice: number;

  @Column({ name: 'stripe_price_id', nullable: true })
  stripePriceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacje będą dodane po utworzeniu innych encji
  // @OneToMany(() => Subscription, (subscription) => subscription.classType)
  // subscriptions: Subscription[];

  // @OneToMany(() => ClassSchedule, (schedule) => schedule.classType)
  // schedules: ClassSchedule[];
}

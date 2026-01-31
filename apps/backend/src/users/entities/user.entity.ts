import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum UserRole {
  USER = 'USER',
  TRENER = 'TRENER',
  ADMINISTRATOR = 'ADMINISTRATOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ name: 'password_hash', nullable: false })
  passwordHash: string;

  @Column({ name: 'first_name', nullable: false })
  firstName: string;

  @Column({ name: 'last_name', nullable: false })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    nullable: false,
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true, nullable: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacje będą dodane po utworzeniu innych encji
  // @OneToMany(() => Subscription, (subscription) => subscription.user)
  // subscriptions: Subscription[];

  // @OneToMany(() => ClassSchedule, (schedule) => schedule.trainer)
  // schedulesAsTrainer: ClassSchedule[];

  // @OneToMany(() => News, (news) => news.author)
  // news: News[];

  // @OneToMany(() => RefreshToken, (token) => token.user)
  // refreshTokens: RefreshToken[];
}

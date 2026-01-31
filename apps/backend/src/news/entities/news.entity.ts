import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NewsType {
  ANNOUNCEMENT = 'announcement',
  EVENT = 'event',
  CANCELLATION = 'cancellation',
}

@Entity('news')
export class News {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: false })
  authorId: string;

  @Column({ nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({
    type: 'enum',
    enum: NewsType,
    nullable: false,
  })
  type: NewsType;

  @Column({ name: 'cover_image_url', nullable: true })
  coverImageUrl: string;

  @CreateDateColumn({ name: 'published_at' })
  publishedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacje
  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;
}

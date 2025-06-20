import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('webapp_comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column({ length: 50 })
  entityType: string; // 'discord_user', 'ticket', 'profile', etc.

  @Column({ length: 100 })
  entityId: string; // ID of the entity being commented on

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ default: false })
  isEdited: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.comments, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;
}
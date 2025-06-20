import { Entity, PrimaryGeneratedColumn, Column, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('webapp_profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: true })
  displayName: string;

  @Column('text', { nullable: true })
  bio: string;

  @Column({ length: 255, nullable: true })
  avatarUrl: string;

  @Column({ length: 7, default: '#007bff' })
  profileColor: string;

  @Column({ length: 50, nullable: true })
  location: string;

  @Column({ length: 100, nullable: true })
  website: string;

  @Column('json', { nullable: true })
  socialLinks: object; // { twitter: '', github: '', linkedin: '' }

  @Column('json', { nullable: true })
  customFields: object; // User-defined custom fields

  @Column({ default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User, user => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;
}
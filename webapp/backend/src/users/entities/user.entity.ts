import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../roles/entities/role.entity';
import { UserPermission } from '../../permissions/entities/user-permission.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Profile } from '../../profile/entities/profile.entity';

@Entity('webapp_users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  @Exclude()
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, length: 50 })
  discordUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  // Relations
  @ManyToOne(() => Role, role => role.users, { eager: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ nullable: true })
  roleId: number;

  @OneToMany(() => UserPermission, userPermission => userPermission.user, { cascade: true })
  userPermissions: UserPermission[];

  @OneToMany(() => Comment, comment => comment.author)
  comments: Comment[];

  @OneToOne(() => Profile, profile => profile.user, { cascade: true })
  profile: Profile;

  // Virtual property for permissions
  get permissions(): string[] {
    return this.userPermissions?.map(up => up.permission.name) || [];
  }
}
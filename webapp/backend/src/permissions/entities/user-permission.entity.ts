import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Permission } from './permission.entity';

@Entity('webapp_user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.userPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Permission, permission => permission.userPermissions, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @Column()
  permissionId: number;

  @Column({ nullable: true })
  grantedBy: number;

  @CreateDateColumn()
  grantedAt: Date;
}
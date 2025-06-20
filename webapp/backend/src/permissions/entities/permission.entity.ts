import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserPermission } from './user-permission.entity';

@Entity('webapp_permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  category: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserPermission, userPermission => userPermission.permission)
  userPermissions: UserPermission[];
}
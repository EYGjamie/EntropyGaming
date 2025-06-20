import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, RolesModule, PermissionsModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
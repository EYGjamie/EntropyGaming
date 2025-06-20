import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Profile } from '../profile/entities/profile.entity';
import { UserPermission } from '../permissions/entities/user-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, UserPermission]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
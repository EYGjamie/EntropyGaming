import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ToolsModule } from './tools/tools.module';
import { CommentsModule } from './comments/comments.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';
import { DiscordModule } from './discord/discord.module';

// Entities
import { User } from './users/entities/user.entity';
import { Role } from './roles/entities/role.entity';
import { Permission } from './permissions/entities/permission.entity';
import { UserPermission } from './permissions/entities/user-permission.entity';
import { Comment } from './comments/entities/comment.entity';
import { Profile } from './profile/entities/profile.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('DATABASE_PATH') || '../bot/database.db',
        entities: [User, Role, Permission, UserPermission, Comment, Profile],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Serve uploaded files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ToolsModule,
    CommentsModule,
    ProfileModule,
    AdminModule,
    DiscordModule,
  ],
})
export class AppModule {}
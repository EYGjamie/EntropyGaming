import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesService } from './roles/roles.service';
import { PermissionsService } from './permissions/permissions.service';
import { UsersService } from './users/users.service';
import { AuthService } from './auth/auth.service';
import * as bcrypt from 'bcryptjs';

async function seed() {
  const app = await NestFactory.create(AppModule);
  
  const rolesService = app.get(RolesService);
  const permissionsService = app.get(PermissionsService);
  const usersService = app.get(UsersService);
  const authService = app.get(AuthService);

  console.log('🌱 Starting database seeding...');

  try {
    // 1. Create default roles
    console.log('Creating default roles...');
    
    const adminRole = await rolesService.create({
      name: 'admin',
      description: 'Administrator with full access',
      color: '#dc3545',
      priority: 100,
    });

    const moderatorRole = await rolesService.create({
      name: 'moderator',
      description: 'Moderator with limited admin access',
      color: '#ffc107',
      priority: 50,
    });

    const memberRole = await rolesService.create({
      name: 'member',
      description: 'Regular member',
      color: '#007bff',
      priority: 10,
    });

    console.log('✅ Default roles created');

    // 2. Permissions are automatically created by PermissionsService.onModuleInit()
    console.log('✅ Default permissions created automatically');

    // 3. Create default admin user
    console.log('Creating default admin user...');
    
    const adminUser = await authService.register({
      username: 'admin',
      email: 'admin@localhost',
      password: 'admin123',
      roleId: adminRole.id,
      isActive: true,
    }, 1);

    console.log('✅ Default admin user created');
    console.log('📧 Email: admin@localhost');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the admin password after first login!');

    // 4. Assign all permissions to admin
    console.log('Assigning permissions to admin...');
    
    const allPermissions = await permissionsService.findAll();
    for (const permission of allPermissions) {
      try {
        await usersService.assignPermission(adminUser.id, permission.id, adminUser.id);
      } catch (error) {
        // Permission might already exist, ignore
      }
    }

    console.log('✅ All permissions assigned to admin');

    // 5. Create example moderator user
    console.log('Creating example moderator user...');
    
    const modUser = await authService.register({
      username: 'moderator',
      email: 'moderator@localhost',
      password: 'mod123',
      roleId: moderatorRole.id,
      isActive: true,
    }, adminUser.id);

    // Assign some permissions to moderator
    const modPermissions = allPermissions.filter(p => 
      p.name.includes('users.view') || 
      p.name.includes('tools.') || 
      p.name.includes('comments.')
    );

    for (const permission of modPermissions) {
      try {
        await usersService.assignPermission(modUser.id, permission.id, adminUser.id);
      } catch (error) {
        // Permission might already exist, ignore
      }
    }

    console.log('✅ Example moderator user created');
    console.log('📧 Email: moderator@localhost');
    console.log('🔑 Password: mod123');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- 3 roles created (admin, moderator, member)');
    console.log('- Default permissions created');
    console.log('- Admin user created with full permissions');
    console.log('- Moderator user created with limited permissions');
    console.log('\n🚀 You can now start the application with: npm run start:dev');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }

  await app.close();
}

// Run the seed function
seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
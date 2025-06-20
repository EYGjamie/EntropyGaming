import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  ParseIntPipe 
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard, RequireRoles, RolesGuard } from '../auth/guards';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @RequireRoles('admin')
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get('active')
  getActivePermissions() {
    return this.permissionsService.getActivePermissions();
  }

  @Get('by-category')
  getPermissionsByCategory() {
    return this.permissionsService.getPermissionsByCategory();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.permissionsService.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @RequireRoles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @RequireRoles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.remove(id);
  }
}
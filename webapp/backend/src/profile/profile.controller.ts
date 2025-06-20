import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, UpdateSocialLinksDto, UpdateCustomFieldsDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  findAll(@Request() req) {
    // Admins can see all profiles, others only public ones
    const includePrivate = req.user.role === 'admin';
    return this.profileService.findAll(includePrivate);
  }

  @Get('public')
  getPublicProfiles() {
    return this.profileService.getPublicProfiles();
  }

  @Get('me')
  async getMyProfile(@Request() req) {
    return this.profileService.findByUserId(req.user.id);
  }

  @Get('user/:userId')
  async getProfileByUserId(@Param('userId', ParseIntPipe) userId: number, @Request() req) {
    const profile = await this.profileService.findByUserId(userId);
    
    // Check if profile is public or if user is viewing their own profile or is admin
    if (!profile.isPublic && profile.userId !== req.user.id && req.user.role !== 'admin') {
      throw new BadRequestException('This profile is private');
    }
    
    return profile;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const profile = await this.profileService.findOne(id);
    
    // Check if profile is public or if user is viewing their own profile or is admin
    if (!profile.isPublic && profile.userId !== req.user.id && req.user.role !== 'admin') {
      throw new BadRequestException('This profile is private');
    }
    
    return profile;
  }

  @Patch('me')
  updateMyProfile(@Body() updateProfileDto: UpdateProfileDto, @Request() req) {
    return this.profileService.update(req.user.id, updateProfileDto, req.user.id);
  }

  @Patch(':userId')
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() req,
  ) {
    return this.profileService.update(userId, updateProfileDto, req.user.id);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.profileService.updateAvatar(req.user.id, file.filename, req.user.id);
  }

  @Post(':userId/toggle-visibility')
  toggleVisibility(@Param('userId', ParseIntPipe) userId: number, @Request() req) {
    return this.profileService.toggleVisibility(userId, req.user.id);
  }

  @Patch('me/social-links')
  updateMySocialLinks(@Body() socialLinksDto: UpdateSocialLinksDto, @Request() req) {
    return this.profileService.updateSocialLinks(req.user.id, socialLinksDto, req.user.id);
  }

  @Patch(':userId/social-links')
  updateSocialLinks(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() socialLinksDto: UpdateSocialLinksDto,
    @Request() req,
  ) {
    return this.profileService.updateSocialLinks(userId, socialLinksDto, req.user.id);
  }

  @Patch('me/custom-fields')
  updateMyCustomFields(@Body() customFieldsDto: UpdateCustomFieldsDto, @Request() req) {
    return this.profileService.updateCustomFields(req.user.id, customFieldsDto.customFields, req.user.id);
  }

  @Patch(':userId/custom-fields')
  updateCustomFields(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() customFieldsDto: UpdateCustomFieldsDto,
    @Request() req,
  ) {
    return this.profileService.updateCustomFields(userId, customFieldsDto.customFields, req.user.id);
  }
}
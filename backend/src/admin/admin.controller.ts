import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('organizations')
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get('organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganization(id);
  }

  @Patch('organizations/:id')
  updateOrganization(
    @Param('id') id: string,
    @Body() dto: { status?: string; planType?: string; maxUsers?: number },
  ) {
    return this.adminService.updateOrganization(id, dto);
  }

  @Get('users')
  listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers(search);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: { role?: string; status?: string },
  ) {
    return this.adminService.updateUser(id, dto);
  }
}

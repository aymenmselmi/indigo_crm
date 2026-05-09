import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  HttpCode,
  Query,
  BadRequestException,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/rbac/guards/roles.guard';
import { Roles } from '@/rbac/decorators/roles.decorator';
import { ActivityService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './dto';

/**
 * Activities Controller
 * CRUD operations with JWT auth, role-based access, tenant filtering
 */
@Controller('activities')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ActivitiesController {
  constructor(private activityService: ActivityService) {}

  // Specific routes BEFORE generic :id route
  @Get('search')
  @Roles('admin', 'manager', 'user')
  async search(@Query('query') query?: string, @Query('limit') limit?: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('query parameter is required');
    }

    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.activityService.search(query.trim(), parsedLimit);
  }

  @Get('contact/:contactId')
  @Roles('admin', 'manager', 'user')
  async getByContact(@Param('contactId') contactId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.activityService.findByContact(contactId, parsedLimit);
  }

  @Get('opportunity/:opportunityId')
  @Roles('admin', 'manager', 'user')
  async getByOpportunity(@Param('opportunityId') opportunityId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.activityService.findByOpportunity(opportunityId, parsedLimit);
  }

  // Generic routes AFTER specific routes
  @Get()
  @Roles('admin', 'manager', 'user')
  async getAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestException('limit and offset must be valid numbers');
      }

      return this.activityService.findAll(parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid pagination parameters');
    }
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  async getById(@Param('id') id: string) {
    return this.activityService.findById(id);
  }

  @Post()
  @Roles('admin', 'manager', 'user')
  @HttpCode(201)
  async create(@Body(new ValidationPipe()) createDto: CreateActivityDto, @Request() req: any) {
    return this.activityService.create({ ...createDto, createdByUserId: req.user?.sub || req.user?.id });
  }

  @Put(':id')
  @Roles('admin', 'manager', 'user')
  async update(@Param('id') id: string, @Body(new ValidationPipe()) updateDto: UpdateActivityDto) {
    return this.activityService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.activityService.delete(id);
  }
}

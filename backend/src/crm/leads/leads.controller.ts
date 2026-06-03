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
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/rbac/guards/roles.guard';
import { Roles } from '@/rbac/decorators/roles.decorator';
import { LeadService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto';

/**
 * Leads Controller
 * CRUD operations with JWT auth, role-based access, tenant filtering
 */
@Controller('leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadsController {
  constructor(private leadService: LeadService) {}

  @Get()
  @Roles('admin', 'manager', 'user')
  async getAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('mine') mine?: string,
    @Req() req?: any,
  ) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestException('limit and offset must be valid numbers');
      }

      const ownerId = mine === 'true' ? req.user?.id : undefined;
      return this.leadService.findAll(parsedLimit, parsedOffset, ownerId);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid pagination parameters');
    }
  }

  @Get('search')
  @Roles('admin', 'manager', 'user')
  async search(@Query('query') query?: string, @Query('limit') limit?: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('query parameter is required');
    }
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.leadService.search(query.trim(), parsedLimit);
  }

  @Get('stats/count')
  @Roles('admin', 'manager', 'user')
  async getCount() {
    return { count: await this.leadService.count() };
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  async getById(@Param('id') id: string) {
    return this.leadService.findById(id);
  }

  @Post()
  @Roles('admin', 'manager', 'user')
  @HttpCode(201)
  async create(@Body(new ValidationPipe()) createDto: CreateLeadDto, @Req() req: any) {
    try {
      return await this.leadService.create(createDto, req.user?.id);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to create lead: ${error.message}`);
    }
  }

  @Put(':id')
  @Roles('admin', 'manager', 'user')
  async update(@Param('id') id: string, @Body(new ValidationPipe()) updateDto: UpdateLeadDto, @Req() req: any) {
    try {
      return await this.leadService.update(id, updateDto, req.user?.id);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to update lead: ${error.message}`);
    }
  }

  /**
   * POST /leads/:id/convert
   * Convert a lead into Contact, Account, and Opportunity
   */
  @Post(':id/convert')
  @Roles('admin', 'manager')
  @HttpCode(200)
  async convertLead(@Param('id') id: string) {
    return this.leadService.convertLead(id);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.leadService.delete(id);
  }

}

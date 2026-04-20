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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/rbac/guards/roles.guard';
import { Roles } from '@/rbac/decorators/roles.decorator';
import { OpportunityService } from './opportunities.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto';

/**
 * Opportunities Controller
 * CRUD operations with JWT auth, role-based access, tenant filtering
 */
@Controller('opportunities')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OpportunitiesController {
  constructor(private opportunityService: OpportunityService) {}

  @Get()
  @Roles('admin', 'manager', 'user')
  async getAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('accountId') accountId?: string,
  ) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestException('limit and offset must be valid numbers');
      }

      // If accountId is provided, filter opportunities for that account
      if (accountId) {
        return this.opportunityService.findByAccountId(accountId, parsedLimit, parsedOffset);
      }

      return this.opportunityService.findAll(parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid pagination parameters');
    }
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  async getById(@Param('id') id: string) {
    return this.opportunityService.findById(id);
  }

  @Get(':id/account')
  @Roles('admin', 'manager', 'user')
  async getAccount(@Param('id') id: string) {
    return this.opportunityService.getAccount(id);
  }

  @Get(':id/activities')
  @Roles('admin', 'manager', 'user')
  async getActivities(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestException('limit and offset must be valid numbers');
      }

      return this.opportunityService.getActivities(id, parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw error;
    }
  }

  @Post()
  @Roles('admin', 'manager', 'user')
  @HttpCode(201)
  async create(@Body() createDto: CreateOpportunityDto) {
    try {
      return await this.opportunityService.create(createDto);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to create opportunity: ${error.message}`);
    }
  }

  @Put(':id')
  @Roles('admin', 'manager', 'user')
  async update(@Param('id') id: string, @Body(new ValidationPipe()) updateDto: UpdateOpportunityDto) {
    try {
      return await this.opportunityService.update(id, updateDto);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to update opportunity: ${error.message}`);
    }
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.opportunityService.delete(id);
  }

  @Get('search')
  @Roles('admin', 'manager', 'user')
  async search(@Query('query') query?: string, @Query('limit') limit?: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('query parameter is required');
    }

    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.opportunityService.search(query.trim(), parsedLimit);
  }

  @Get('stats/count')
  @Roles('admin', 'manager', 'user')
  async getCount() {
    return { count: await this.opportunityService.count() };
  }
}

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
import { AccountService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

/**
 * Accounts Controller
 * 
 * CRUD operations for Accounts with:
 * - JWT authentication (@UseGuards(AuthGuard('jwt')))
 * - Role-based access control (@Roles('admin', 'manager'))
 * - Automatic tenant filtering
 * - DTO validation
 * - Pagination support
 */
@Controller('accounts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AccountsController {
  constructor(private accountService: AccountService) {}

  /**
   * GET /accounts?limit=20&offset=0
   * List all accounts for current tenant with pagination
   * 
   * @query limit - Records per page (1-100, default 20)
   * @query offset - Pagination offset (default 0)
   */
  @Get()
  @Roles('admin', 'manager', 'user')
  async getAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      const parsedOffset = offset ? parseInt(offset, 10) : 0;

      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestException('limit and offset must be valid numbers');
      }

      return this.accountService.findAll(parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid pagination parameters');
    }
  }

  /**
   * GET /accounts/:id
   * Get specific account (tenant check automatic)
   */
  @Get(':id')
  @Roles('admin', 'manager', 'user')
  async getById(@Param('id') id: string) {
    return this.accountService.findById(id);
  }

  /**
   * GET /accounts/:id/contacts
   * Get all contacts linked to an account with pagination
   * 
   * @query limit - Records per page (1-100, default 50)
   * @query offset - Pagination offset (default 0)
   */
  @Get(':id/contacts')
  @Roles('admin', 'manager', 'user')
  async getContacts(
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

      return this.accountService.getContacts(id, parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw error;
    }
  }

  /**
   * GET /accounts/:id/opportunities
   * Get all opportunities linked to an account with pagination
   * 
   * @query limit - Records per page (1-100, default 50)
   * @query offset - Pagination offset (default 0)
   */
  @Get(':id/opportunities')
  @Roles('admin', 'manager', 'user')
  async getOpportunities(
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

      return this.accountService.getOpportunities(id, parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw error;
    }
  }

  /**
   * POST /accounts
   * Create new account
   * 
   * @body CreateAccountDto
   */
  @Post()
  @Roles('admin', 'manager', 'user')
  @HttpCode(201)
  async create(@Body(new ValidationPipe()) createDto: CreateAccountDto) {
    try {
      return await this.accountService.create(createDto);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to create account: ${error.message}`);
    }
  }

  /**
   * PUT /accounts/:id
   * Update account
   * 
   * @body UpdateAccountDto (all fields optional)
   */
  @Put(':id')
  @Roles('admin', 'manager')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) updateDto: UpdateAccountDto,
  ) {
    return this.accountService.update(id, updateDto);
  }

  /**
   * DELETE /accounts/:id
   * Delete account
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.accountService.delete(id);
  }

  /**
   * GET /accounts/search?query=name
   * Search accounts by name (case-insensitive)
   * 
   * @query query - Search string (required)
   * @query limit - Max results (default 20)
   */
  @Get('search')
  @Roles('admin', 'manager', 'user')
  async search(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('query parameter is required');
    }

    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.accountService.search(query.trim(), parsedLimit);
  }

  /**
   * GET /accounts/stats/count
   * Get total account count for current tenant
   */
  @Get('stats/count')
  @Roles('admin', 'manager', 'user')
  async getCount() {
    return {
      count: await this.accountService.count(),
    };
  }
}

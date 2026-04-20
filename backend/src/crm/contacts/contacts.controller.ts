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
import { ContactService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto';

/**
 * Contacts Controller
 * CRUD operations with JWT auth, role-based access, tenant filtering
 */
@Controller('contacts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ContactsController {
  constructor(private contactService: ContactService) {}

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

      // If accountId is provided, filter contacts for that account
      if (accountId) {
        return this.contactService.findByAccountId(accountId, parsedLimit, parsedOffset);
      }

      return this.contactService.findAll(parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid pagination parameters');
    }
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  async getById(@Param('id') id: string) {
    return this.contactService.findById(id);
  }

  @Get(':id/account')
  @Roles('admin', 'manager', 'user')
  async getAccount(@Param('id') id: string) {
    return this.contactService.getAccount(id);
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

      return this.contactService.getActivities(id, parsedLimit, parsedOffset);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw error;
    }
  }

  @Post()
  @Roles('admin', 'manager', 'user')
  @HttpCode(201)
  async create(@Body(new ValidationPipe()) createDto: CreateContactDto) {
    try {
      return await this.contactService.create(createDto);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to create contact: ${error.message}`);
    }
  }

  @Put(':id')
  @Roles('admin', 'manager', 'user')
  async update(@Param('id') id: string, @Body(new ValidationPipe()) updateDto: UpdateContactDto) {
    try {
      return await this.contactService.update(id, updateDto);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to update contact: ${error.message}`);
    }
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.contactService.delete(id);
  }

  @Get('search')
  @Roles('admin', 'manager', 'user')
  async search(@Query('query') query?: string, @Query('limit') limit?: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('query parameter is required');
    }

    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    return this.contactService.search(query.trim(), parsedLimit);
  }

  @Get('stats/count')
  @Roles('admin', 'manager', 'user')
  async getCount() {
    return { count: await this.contactService.count() };
  }
}

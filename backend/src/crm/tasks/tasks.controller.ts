import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Task, TaskStatus } from '@/database/entities/tenant/task.entity';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { RolesGuard } from '@/rbac/guards/roles.guard';
import { Roles } from '@/rbac/decorators/roles.decorator';

@Controller('api/tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TasksController {
  constructor(private readonly taskService: TasksService) {}

  @Get('search')
  @Roles('admin', 'manager', 'user')
  async search(
    @Query('search') search: string,
    @Query('limit', new DefaultValuePipe(50), new ParseIntPipe()) limit: number,
    @Query('offset', new DefaultValuePipe(0), new ParseIntPipe()) offset: number,
  ) {
    return this.taskService.findAll(limit, offset, { search });
  }

  @Get('overdue')
  @Roles('admin', 'manager', 'user')
  async getOverdue(
    @Query('limit', new DefaultValuePipe(50), new ParseIntPipe()) limit: number,
    @Query('offset', new DefaultValuePipe(0), new ParseIntPipe()) offset: number,
  ) {
    return this.taskService.findOverdueTasks(limit, offset);
  }

  @Get('blocked')
  @Roles('admin', 'manager', 'user')
  async getBlocked(
    @Query('limit', new DefaultValuePipe(50), new ParseIntPipe()) limit: number,
    @Query('offset', new DefaultValuePipe(0), new ParseIntPipe()) offset: number,
  ) {
    return this.taskService.findBlockedTasks(limit, offset);
  }

  @Get('stats')
  @Roles('admin', 'manager', 'user')
  async getStats() {
    return this.taskService.getTaskStats();
  }

  @Get('my-tasks')
  @Roles('admin', 'manager', 'user')
  async getMyTasks(
    @Query('limit', new DefaultValuePipe(50), new ParseIntPipe()) limit: number,
    @Query('offset', new DefaultValuePipe(0), new ParseIntPipe()) offset: number,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.taskService.findByAssignee(userId, limit, offset);
  }

  @Get()
  @Roles('admin', 'manager', 'user')
  async findAll(
    @Query('limit', new DefaultValuePipe(50), new ParseIntPipe()) limit: number,
    @Query('offset', new DefaultValuePipe(0), new ParseIntPipe()) offset: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    const filters = { status, priority, assignedToId };
    return this.taskService.findAll(limit, offset, filters);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'user')
  async findById(@Param('id') id: string) {
    return this.taskService.findById(id);
  }

  @Post()
  @Roles('admin', 'manager', 'user')
  async create(@Body() createTaskDto: CreateTaskDto, @Req() req: any) {
    const userId = req.user.id;
    return this.taskService.create(createTaskDto, userId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'user')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  async delete(@Param('id') id: string) {
    return this.taskService.delete(id);
  }
}

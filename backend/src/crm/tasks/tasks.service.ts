import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '@/database/entities/tenant/task.entity';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private databaseSwitcher: DatabaseSwitcherService,
    private tenantContext: TenantContextService,
  ) {}

  async findAll(limit: number = 50, offset: number = 0, filters?: any) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      console.log(`[Tasks.findAll] Getting datasource for org ${organizationId}`);
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      console.log(`[Tasks.findAll] Got datasource, getting repository for Task`);
      const repository = dataSource.getRepository(Task);
      console.log(`[Tasks.findAll] Got repository, building query`);

      let query = repository.createQueryBuilder('task')
        .where('task.organizationId = :organizationId', { organizationId })
        .leftJoinAndSelect('task.assignedTo', 'assignedTo')
        .leftJoinAndSelect('task.createdByUser', 'createdByUser')
        .leftJoinAndSelect('task.relatedContact', 'relatedContact')
        .leftJoinAndSelect('task.relatedOpportunity', 'relatedOpportunity')
        .leftJoinAndSelect('task.relatedAccount', 'relatedAccount')
        .leftJoinAndSelect('task.comments', 'comments');

      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.andWhere('task.status = :status', { status: filters.status });
        }
        if (filters.priority) {
          query = query.andWhere('task.priority = :priority', { priority: filters.priority });
        }
        if (filters.assignedToId) {
          query = query.andWhere('task.assignedToId = :assignedToId', { assignedToId: filters.assignedToId });
        }
        if (filters.relatedContactId) {
          query = query.andWhere('task.relatedContactId = :relatedContactId', { relatedContactId: filters.relatedContactId });
        }
        if (filters.isBlocked !== undefined) {
          query = query.andWhere('task.isBlocked = :isBlocked', { isBlocked: filters.isBlocked });
        }
        if (filters.search) {
          query = query.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
            search: `%${filters.search}%`,
          });
        }
      }

      const [data, total] = await query
        .orderBy('task.dueDate', 'ASC')
        .addOrderBy('task.priority', 'DESC')
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return { data, total, limit, offset, hasMore: offset + limit < total };
    } catch (error) {
      console.error('[Tasks.findAll] Error fetching tasks:', error);
      console.error('[Tasks.findAll] Error message:', error?.message);
      console.error('[Tasks.findAll] Error stack:', error?.stack);
      throw new BadRequestException(`Failed to fetch tasks: ${error?.message}`);
    }
  }

  async findById(id: string) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const task = await repository.findOne({
        where: { id, organizationId },
        relations: [
          'assignedTo',
          'createdByUser',
          'relatedContact',
          'relatedOpportunity',
          'relatedAccount',
          'comments',
          'comments.createdBy',
        ],
      });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error finding task:', error);
      throw new BadRequestException('Failed to find task');
    }
  }

  async create(createTaskDto: CreateTaskDto, userId: string) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      // Validate that at least one related entity is provided if task is for tracking
      if (!createTaskDto.relatedContactId && !createTaskDto.relatedOpportunityId && !createTaskDto.relatedAccountId) {
        console.warn('Task created without related entity');
      }

      const task = repository.create({
        ...createTaskDto,
        organizationId,
        createdByUserId: userId, // Set FK column directly
      });

      const savedTask = await repository.save(task);
      return this.findById(savedTask.id);
    } catch (error) {
      console.error('[Tasks.create] Error creating task:', error);
      console.error('[Tasks.create] Error message:', error?.message);
      console.error('[Tasks.create] Error stack:', error?.stack);
      console.error('[Tasks.create] DTO:', createTaskDto);
      throw new BadRequestException(`Failed to create task: ${error?.message}`);
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const task = await this.findById(id);

      // Handle status transitions and completion logic
      if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
        updateTaskDto.completedAt = new Date();
      }

      Object.assign(task, updateTaskDto);
      await repository.save(task);

      return this.findById(id);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new BadRequestException('Failed to update task');
    }
  }

  async delete(id: string) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const task = await this.findById(id);
      await repository.delete({ id, organizationId });

      return task;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new BadRequestException('Failed to delete task');
    }
  }

  async findByAssignee(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const [data, total] = await repository
        .createQueryBuilder('task')
        .where('task.organizationId = :organizationId AND task.assignedToId = :userId', {
          organizationId,
          userId,
        })
        .leftJoinAndSelect('task.assignedTo', 'assignedTo')
        .leftJoinAndSelect('task.createdByUser', 'createdByUser')
        .leftJoinAndSelect('task.relatedContact', 'relatedContact')
        .leftJoinAndSelect('task.relatedOpportunity', 'relatedOpportunity')
        .orderBy('task.dueDate', 'ASC')
        .addOrderBy('task.priority', 'DESC')
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return { data, total, limit, offset, hasMore: offset + limit < total };
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw new BadRequestException('Failed to fetch user tasks');
    }
  }

  async findBlockedTasks(limit: number = 50, offset: number = 0) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const [data, total] = await repository
        .createQueryBuilder('task')
        .where('task.organizationId = :organizationId AND task.isBlocked = true', { organizationId })
        .leftJoinAndSelect('task.assignedTo', 'assignedTo')
        .leftJoinAndSelect('task.createdByUser', 'createdByUser')
        .orderBy('task.createdAt', 'DESC')
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return { data, total, limit, offset, hasMore: offset + limit < total };
    } catch (error) {
      console.error('Error fetching blocked tasks:', error);
      throw new BadRequestException('Failed to fetch blocked tasks');
    }
  }

  async findOverdueTasks(limit: number = 50, offset: number = 0) {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const now = new Date();

      const [data, total] = await repository
        .createQueryBuilder('task')
        .where('task.organizationId = :organizationId', { organizationId })
        .andWhere('task.dueDate < :now', { now })
        .andWhere('task.status != :completedStatus', { completedStatus: TaskStatus.COMPLETED })
        .leftJoinAndSelect('task.assignedTo', 'assignedTo')
        .leftJoinAndSelect('task.createdByUser', 'createdByUser')
        .orderBy('task.dueDate', 'ASC')
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return { data, total, limit, offset, hasMore: offset + limit < total };
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw new BadRequestException('Failed to fetch overdue tasks');
    }
  }

  async getTaskStats() {
    try {
      const organizationId = this.tenantContext.getOrganizationId();
      const dataSource = await this.databaseSwitcher.getDataSourceForOrganization(organizationId);
      const repository = dataSource.getRepository(Task);

      const total = await repository.count({ where: { organizationId } });
      const completed = await repository.count({ where: { organizationId, status: TaskStatus.COMPLETED } });
      const overdue = await repository.count({
        where: {
          organizationId,
          dueDate: In([undefined, null]) || (repository.manager as any).createQueryBuilder().where('dueDate < NOW()'),
          status: In([TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]),
        },
      });

      return { total, completed, remaining: total - completed, overdue };
    } catch (error) {
      console.error('Error getting task stats:', error);
      return { total: 0, completed: 0, remaining: 0, overdue: 0 };
    }
  }
}

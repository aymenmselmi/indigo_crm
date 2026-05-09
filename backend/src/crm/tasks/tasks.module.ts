import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { DatabaseModule } from '@/database/database.module';
import { TenantModule } from '@/tenant/tenant.module';

@Module({
  imports: [DatabaseModule, TenantModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}

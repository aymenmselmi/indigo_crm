import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { DatabaseModule } from '@/database/database.module';
import { TenantModule } from '@/tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, TenantModule, forwardRef(() => NotificationsModule)],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}

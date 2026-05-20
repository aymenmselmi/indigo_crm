import { Module } from '@nestjs/common';
import { AdminController, ManagerController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, ManagerController],
  providers: [AdminService],
})
export class AdminModule {}

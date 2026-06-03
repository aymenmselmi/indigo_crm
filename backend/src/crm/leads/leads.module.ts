import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '@/database/entities/tenant/lead.entity';
import { LeadService } from './leads.service';
import { LeadsController } from './leads.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), forwardRef(() => NotificationsModule)],
  providers: [LeadService],
  controllers: [LeadsController],
  exports: [LeadService],
})
export class LeadsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '@/database/entities/tenant/opportunity.entity';
import { OpportunityService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity]), forwardRef(() => NotificationsModule)],
  providers: [OpportunityService],
  controllers: [OpportunitiesController],
  exports: [OpportunityService],
})
export class OpportunitiesModule {}

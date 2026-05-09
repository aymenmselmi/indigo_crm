import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ActivitiesModule } from './activities/activities.module';
import { TasksModule } from './tasks/tasks.module';

/**
 * CRM Module
 * 
 * Combines all CRM feature modules with tenant-aware CRUD capabilities:
 * - Accounts (customers/companies)
 * - Contacts (customer contacts)
 * - Leads (potential customers)
 * - Opportunities (sales opportunities)
 * - Activities (calls, emails, meetings, tasks)
 */
@Module({
  imports: [
    AccountsModule,
    ContactsModule,
    LeadsModule,
    OpportunitiesModule,
    ActivitiesModule,
    TasksModule,
  ],
  exports: [
    AccountsModule,
    ContactsModule,
    LeadsModule,
    OpportunitiesModule,
    ActivitiesModule,
    TasksModule,
  ],
})
export class CrmModule {}

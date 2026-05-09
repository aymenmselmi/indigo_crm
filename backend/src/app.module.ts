import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { CrmModule } from './crm/crm.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    TenantModule,
    DatabaseModule,
    AuthModule,
    RbacModule,
    CrmModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

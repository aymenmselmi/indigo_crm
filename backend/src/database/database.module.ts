import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Organization, GlobalUser, TenantConfig, Invitation } from './entities/master';
import { User, Role, Permission, Account, Contact, Lead, Opportunity, Activity, DynamicEntity, DynamicField } from './entities/tenant';

@Module({
  imports: [
    // Single Default Database Connection
    // Entities from both master and tenant for initial setup
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: parseInt(configService.get('DATABASE_PORT', '5432')),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'crm_dev'),
        entities: [
          // Master entities
          Organization,
          GlobalUser,
          TenantConfig,
          Invitation,
          // Tenant entities
          User,
          Role,
          Permission,
          Account,
          Contact,
          Lead,
          Opportunity,
          Activity,
          DynamicEntity,
          DynamicField,
        ],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: false,
      }),
    }),

    // Export all entities for use in other modules
    TypeOrmModule.forFeature([
      Organization,
      GlobalUser,
      TenantConfig,
      Invitation,
      User,
      Role,
      Permission,
      Account,
      Contact,
      Lead,
      Opportunity,
      Activity,
      DynamicEntity,
      DynamicField,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

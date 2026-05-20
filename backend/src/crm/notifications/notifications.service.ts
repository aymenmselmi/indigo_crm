import { Injectable } from '@nestjs/common';
import { DatabaseSwitcherService } from '@/tenant/services/database-switcher.service';
import { TenantContextService } from '@/tenant/services/tenant-context.service';
import { Notification } from '@/database/entities/tenant/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private databaseSwitcher: DatabaseSwitcherService,
    private tenantContext: TenantContextService,
  ) {}

  private async repo() {
    const orgId = this.tenantContext.getOrganizationId();
    const ds = await this.databaseSwitcher.getDataSourceForOrganization(orgId);
    return ds.getRepository(Notification);
  }

  async findForUser(userId: string, limit = 30) {
    const repo = await this.repo();
    return repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    const repo = await this.repo();
    return repo.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    const repo = await this.repo();
    await repo.update({ id, userId }, { read: true });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    const repo = await this.repo();
    await repo.update({ userId, read: false }, { read: true });
    return { ok: true };
  }

  async create(payload: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  }) {
    const repo = await this.repo();
    const n = repo.create({ ...payload, read: false });
    return repo.save(n);
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const allowed = ['manager', 'admin', 'super_admin'];
    if (!user || !allowed.includes(user.role)) {
      throw new ForbiddenException('Manager access required');
    }
    return true;
  }
}

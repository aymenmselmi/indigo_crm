import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
@Index(['userId'])
@Index(['userId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'task_assigned' | 'activity_logged' | 'deal_updated'

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entityType: string; // 'task' | 'deal' | 'contact'

  @Column({ type: 'uuid', nullable: true })
  entityId: string;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';
import { Account } from './account.entity';
import { TaskComment } from './task-comment.entity';

export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
@Index(['organizationId'])
@Index(['assignedToId'])
@Index(['createdByUserId'])
@Index(['relatedContactId'])
@Index(['relatedOpportunityId'])
@Index(['relatedAccountId'])
@Index(['status'])
@Index(['priority'])
@Index(['dueDate'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.OPEN })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualHours: number;

  @Column({ type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ type: 'text', nullable: true })
  blockReason: string;

  // Relations with FK columns
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ type: 'uuid', nullable: true, name: 'assigned_to_id' })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdByUser: User;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdByUserId: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_contact_id' })
  relatedContact: Contact;

  @Column({ type: 'uuid', nullable: true, name: 'related_contact_id' })
  relatedContactId: string;

  @ManyToOne(() => Opportunity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_opportunity_id' })
  relatedOpportunity: Opportunity;

  @Column({ type: 'uuid', nullable: true, name: 'related_opportunity_id' })
  relatedOpportunityId: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_account_id' })
  relatedAccount: Account;

  @Column({ type: 'uuid', nullable: true, name: 'related_account_id' })
  relatedAccountId: string;

  @OneToMany(() => TaskComment, (comment) => comment.task, { cascade: true })
  comments: TaskComment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

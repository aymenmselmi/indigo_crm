import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';

@Entity('activities')
@Index(['tenantId'])
@Index(['createdByUserId'])
@Index(['relatedContactId'])
@Index(['relatedOpportunityId'])
@Index(['dueDate'])
@Index(['status'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'varchar', length: 50, default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @Column({ type: 'uuid', nullable: true })
  relatedContactId: string;

  @Column({ type: 'uuid', nullable: true })
  relatedOpportunityId: string;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.activities)
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @ManyToOne(() => Contact, (contact) => contact.activities, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedContactId' })
  relatedContact: Contact;

  @ManyToOne(() => Opportunity, (opp) => opp.activities, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedOpportunityId' })
  relatedOpportunity: Opportunity;
}

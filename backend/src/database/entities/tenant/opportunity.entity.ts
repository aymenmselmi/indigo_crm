import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Lead } from './lead.entity';
import { Account } from './account.entity';
import { Activity } from './activity.entity';

@Entity('opportunities')
@Index(['tenantId'])
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  leadId: string;

  @Column({ type: 'uuid', nullable: true })
  accountId: string;

  @Column({ type: 'varchar', length: 100, default: 'prospecting' })
  stage: string; // 'prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, default: null })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  probability: number; // 0-100

  @Column({ type: 'date', nullable: true })
  expectedCloseDate: Date;

  @Column({ type: 'date', nullable: true })
  actualCloseDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: 'open' | 'closed-won' | 'closed-lost';

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Lead, (lead) => lead.opportunities, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @ManyToOne(() => Account, (account) => account.opportunities, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @OneToMany(() => Activity, (activity) => activity.relatedOpportunity)
  activities: Activity[];
}

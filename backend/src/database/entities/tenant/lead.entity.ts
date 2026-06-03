import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Opportunity } from './opportunity.entity';

@Entity('leads')
@Index(['tenantId'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 50, default: 'new' })
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';

  @Column({ type: 'varchar', length: 50, default: 'cold' })
  source: 'website' | 'email' | 'phone' | 'referral' | 'event' | 'social' | 'cold';

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  estimatedValue: number;

  @Column({ type: 'integer', default: 0 })
  leadScore: number;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Opportunity, (opp) => opp.lead)
  opportunities: Opportunity[];
}

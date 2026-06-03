import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';

@Entity('accounts')
@Index(['tenantId'])
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'prospect' })
  type: 'prospect' | 'customer' | 'partner' | 'competitor';

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  billingAddress: string;

  @Column({ type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  @Column({ type: 'integer', nullable: true })
  employees: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  annualRevenue: number;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Contact, (contact) => contact.account)
  contacts: Contact[];

  @OneToMany(() => Opportunity, (opp) => opp.account)
  opportunities: Opportunity[];
}

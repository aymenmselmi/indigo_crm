import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Account } from './account.entity';
import { Activity } from './activity.entity';

@Entity('contacts')
@Index(['tenantId'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  firstName!: string;

  @Column({ type: 'varchar', length: 255 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobilePhone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: 'active' | 'inactive' | 'prospect';

  @Column({ type: 'uuid' })
  accountId!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({ type: 'json', nullable: true })
  customFields?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Account, (account) => account.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @OneToMany(() => Activity, (activity) => activity.relatedContact)
  activities!: Activity[];
}

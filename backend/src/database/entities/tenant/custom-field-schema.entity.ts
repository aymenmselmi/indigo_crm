import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type CfEntityType = 'lead' | 'account' | 'contact' | 'opportunity';
export type CfFieldType  = 'text' | 'number' | 'date' | 'boolean' | 'dropdown';

@Entity('custom_field_schemas')
export class CustomFieldSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  entityType: CfEntityType;

  @Column({ type: 'varchar', length: 100 })
  name: string; // slug — used as key in customFields JSON

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 50, default: 'text' })
  fieldType: CfFieldType;

  @Column({ type: 'simple-array', nullable: true })
  options: string[]; // only for dropdown

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;
}

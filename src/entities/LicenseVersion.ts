import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { License } from './License';

@Entity()
export class LicenseVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('jsonb')
    data: any;

    @CreateDateColumn()
    createdAt!: Date;

    @ManyToOne(() => License, license => license.versions)
    license!: License;
} 
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { License } from './License';

@Entity()
export class LicenseVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column('jsonb')
    data: any;

    @ManyToOne(() => License, license => license.versions)
    license!: License;
}
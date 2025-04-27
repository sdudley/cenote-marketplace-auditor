import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { License } from './License';

@Entity()
export class LicenseVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column('jsonb')
    @Index('IDX_license_version_data_gin', { synchronize: false })
    data: any;

    @ManyToOne(() => License, license => license.versions)
    license!: License;
}
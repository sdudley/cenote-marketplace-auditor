import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { LicenseVersion } from './LicenseVersion';
import { LicenseData } from '../types/marketplace';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    marketplaceLicenseId!: string;

    @Column('jsonb')
    @Index('IDX_license_currentData_gin', { synchronize: false })
    currentData!: LicenseData;

    @OneToMany(() => LicenseVersion, version => version.license)
    versions!: LicenseVersion[];
}
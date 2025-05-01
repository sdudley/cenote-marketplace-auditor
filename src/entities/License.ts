import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { LicenseVersion } from './LicenseVersion';
import { LicenseData } from '../types/marketplace';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column()
    @Index()
    entitlementId!: string;

    @Column('jsonb')
    @Index('IDX_license_data_gin', { synchronize: false })
    data!: LicenseData;

    @OneToMany(() => LicenseVersion, version => version.license)
    versions!: LicenseVersion[];
}
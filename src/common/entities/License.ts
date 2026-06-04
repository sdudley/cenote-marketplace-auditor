import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, type Relation } from 'typeorm';
import type { LicenseVersion } from './LicenseVersion.js';
import type { LicenseData } from '../types/marketplace.js';
import type { Transaction } from './Transaction.js';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ type: 'varchar' })
    @Index({ unique: true })
    entitlementId!: string;

    @Column({ type: 'int' })
    currentVersion!: number;

    @Column('jsonb')
    @Index('IDX_license_data_gin', { synchronize: false })
    data!: LicenseData;

    @OneToMany('LicenseVersion', 'license')
    versions!: Relation<LicenseVersion>[];

    @OneToMany('Transaction', 'license')
    transactions!: Relation<Transaction>[];
}

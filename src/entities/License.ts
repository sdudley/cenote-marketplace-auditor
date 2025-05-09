import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, JoinColumn } from 'typeorm';
import { LicenseVersion } from './LicenseVersion';
import { LicenseData } from '../types/marketplace';
import { Transaction } from './Transaction';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column()
    @Index({ unique: true })
    entitlementId!: string;

    @Column()
    currentVersion!: number;

    @Column('jsonb')
    @Index('IDX_license_data_gin', { synchronize: false })
    data!: LicenseData;

    @OneToMany(() => LicenseVersion, version => version.license)
    versions!: LicenseVersion[];

    @OneToMany(() => Transaction, transaction => transaction.license)
    @JoinColumn({ name: 'entitlementId', referencedColumnName: 'entitlementId' })
    transactions!: Transaction[];
}
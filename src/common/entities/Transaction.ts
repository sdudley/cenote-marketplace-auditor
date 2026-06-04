import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, ManyToOne, OneToOne, type Relation } from 'typeorm';
import type { TransactionVersion } from './TransactionVersion.js';
import type { TransactionData } from '../types/marketplace.js';
import type { License } from './License.js';
import type { TransactionReconcile } from './TransactionReconcile.js';

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column()
    @Index()
    marketplaceTransactionId!: string;

    @Column()
    @Index()
    entitlementId!: string;

    @Column()
    currentVersion!: number;

    @ManyToOne(() => License, license => license.transactions)
    // @JoinColumn({ name: 'entitlement_id', referencedColumnName: 'entitlementId' })
    license!: License;

    @Column('jsonb')
    @Index('IDX_transaction_data_gin', { synchronize: false })
    data!: TransactionData;

    @OneToMany(() => TransactionVersion, version => version.transaction)
    versions!: TransactionVersion[];

    @OneToOne(() => TransactionReconcile, reconcile => reconcile.transaction)
    reconcile!: TransactionReconcile;
}
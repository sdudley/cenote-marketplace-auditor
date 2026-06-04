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

    @Column({ type: 'varchar' })
    @Index()
    marketplaceTransactionId!: string;

    @Column({ type: 'varchar' })
    @Index()
    entitlementId!: string;

    @Column({ type: 'int' })
    currentVersion!: number;

    @ManyToOne('License', 'transactions')
    license!: Relation<License>;

    @Column('jsonb')
    @Index('IDX_transaction_data_gin', { synchronize: false })
    data!: TransactionData;

    @OneToMany('TransactionVersion', 'transaction')
    versions!: Relation<TransactionVersion>[];

    @OneToOne('TransactionReconcile', 'transaction')
    reconcile!: Relation<TransactionReconcile>;
}

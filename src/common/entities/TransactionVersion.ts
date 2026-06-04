import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, Unique, type Relation } from 'typeorm';
import type { Transaction } from './Transaction.js';

@Entity()
@Unique(['transaction', 'version'])
export class TransactionVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'varchar' })
    @Index()
    entitlementId!: string;

    @Column({ type: 'int' })
    version!: number;

    @Column('jsonb')
    @Index('IDX_transaction_version_data_gin', { synchronize: false })
    data: any;

    @Column({ type: 'text', nullable: true })
    diff?: string;

    @ManyToOne('Transaction', 'versions')
    transaction!: Relation<Transaction>;
}

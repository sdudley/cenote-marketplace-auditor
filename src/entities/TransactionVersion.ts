import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class TransactionVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    entitlementId!: string;

    @Column('jsonb')
    @Index('IDX_transaction_version_data_gin', { synchronize: false })
    data: any;

    @Column({ nullable: true })
    diff?: string;

    @ManyToOne(() => Transaction, transaction => transaction.versions)
    transaction!: Transaction;

    @OneToOne(() => TransactionVersion, { nullable: true })
    @JoinColumn()
    nextTransactionVersion?: TransactionVersion;

    @OneToOne(() => TransactionVersion, { nullable: true })
    @JoinColumn()
    priorTransactionVersion?: TransactionVersion;
}
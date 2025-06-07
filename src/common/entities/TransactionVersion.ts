import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, Unique } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
@Unique(['transaction', 'version'])
export class TransactionVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    entitlementId!: string;

    @Column()
    version!: number;

    @Column('jsonb')
    @Index('IDX_transaction_version_data_gin', { synchronize: false })
    data: any;

    @Column({ nullable: true })
    diff?: string;

    @ManyToOne(() => Transaction, transaction => transaction.versions)
    transaction!: Transaction;
}
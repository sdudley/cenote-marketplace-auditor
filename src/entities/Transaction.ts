import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { TransactionVersion } from './TransactionVersion';
import { TransactionData } from '../types/marketplace';

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    marketplaceTransactionId!: string;

    @Column('jsonb')
    @Index('IDX_transaction_currentData_gin', { synchronize: false })
    currentData!: TransactionData;

    @OneToMany(() => TransactionVersion, version => version.transaction)
    versions!: TransactionVersion[];
}
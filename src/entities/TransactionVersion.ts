import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class TransactionVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('jsonb')
    data: any;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Transaction, transaction => transaction.versions)
    transaction: Transaction;
} 
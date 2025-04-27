import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class TransactionVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column('jsonb')
    data: any;

    @ManyToOne(() => Transaction, transaction => transaction.versions)
    transaction!: Transaction;
}
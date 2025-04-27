import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { TransactionVersion } from './TransactionVersion';

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    @Index()
    marketplaceTransactionId!: string;

    @Column('jsonb')
    currentData: any;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => TransactionVersion, version => version.transaction)
    versions!: TransactionVersion[];
}
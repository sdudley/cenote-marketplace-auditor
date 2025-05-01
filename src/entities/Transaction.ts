import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TransactionVersion } from './TransactionVersion';
import { TransactionData } from '../types/marketplace';
import { License } from './License';

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

    @ManyToOne(() => License, license => license.transactions)
    @JoinColumn({ name: 'entitlementId', referencedColumnName: 'entitlementId' })
    license!: License;

    @Column('jsonb')
    @Index('IDX_transaction_data_gin', { synchronize: false })
    data!: TransactionData;

    @OneToMany(() => TransactionVersion, version => version.transaction)
    versions!: TransactionVersion[];
}
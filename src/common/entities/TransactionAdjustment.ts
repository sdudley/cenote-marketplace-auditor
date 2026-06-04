import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Transaction } from './Transaction.js';

@Entity()
export class TransactionAdjustment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne('Transaction')
    @JoinColumn()
    transaction!: Relation<Transaction>;

    @Column('decimal', {
        precision: 14,
        scale: 4,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        } })
    purchasePriceDiscount?: number;

    @Column({ type: 'text', nullable: true })
    notes?: string;
}

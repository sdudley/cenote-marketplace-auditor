import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany, type Relation } from 'typeorm';
import type { Transaction } from './Transaction.js';
import type { TransactionReconcileNote } from './TransactionReconcileNote.js';

@Entity()
export class TransactionReconcile {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToOne('Transaction', 'reconcile')
    @JoinColumn()
    transaction!: Relation<Transaction>;

    @Column({ type: 'int' })
    transactionVersion!: number;

    @Column({ type: 'boolean' })
    reconciled!: boolean;

    @Column({ type: 'boolean' })
    automatic!: boolean;

    @Column('decimal', {
        precision: 14,
        scale: 4,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        } })
    actualVendorAmount?: number;

    @Column('decimal', {
        precision: 14,
        scale: 4,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        } })
    expectedVendorAmount?: number;

    @Column({ type: 'int', default: 1 })
    reconcilerVersion!: number;

    @OneToMany('TransactionReconcileNote', 'transactionReconcile')
    notes!: Relation<TransactionReconcileNote>[];
}

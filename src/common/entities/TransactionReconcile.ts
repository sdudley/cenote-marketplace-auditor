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

    @OneToOne(() => Transaction)
    @JoinColumn()
    transaction!: Transaction;

    @Column()
    transactionVersion!: number;

    @Column()
    reconciled!: boolean;

    @Column()
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

    @Column({ default: 1 })
    reconcilerVersion!: number;

    @OneToMany(() => TransactionReconcileNote, (note: TransactionReconcileNote) => note.transactionReconcile)
    notes!: TransactionReconcileNote[];
}
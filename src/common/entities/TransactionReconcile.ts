import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Transaction } from './Transaction';
import { TransactionReconcileNote } from './TransactionReconcileNote';

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
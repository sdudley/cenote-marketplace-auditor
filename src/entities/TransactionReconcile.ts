import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToOne } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class TransactionReconcile {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Transaction)
    @JoinColumn()
    transaction!: Transaction;

    @Column()
    transactionVersion!: number;

    @Column()
    reconciled!: boolean;

    @Column()
    automatic!: boolean;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column('decimal', { precision: 14, scale: 2, nullable: true })
    actualVendorAmount?: number;

    @Column('decimal', { precision: 14, scale: 2, nullable: true })
    expectedVendorAmount?: number;

    @Column()
    current!: boolean;
}
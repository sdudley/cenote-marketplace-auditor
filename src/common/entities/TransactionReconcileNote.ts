import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import type { TransactionReconcile } from './TransactionReconcile.js';

@Entity()
export class TransactionReconcileNote {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'text' })
    note!: string;

    @Column()
    transactionVersion!: number;

    @ManyToOne(() => TransactionReconcile)
    @JoinColumn()
    transactionReconcile!: TransactionReconcile;
}
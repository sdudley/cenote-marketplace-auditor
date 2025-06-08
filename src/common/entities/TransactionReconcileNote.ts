import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TransactionReconcile } from './TransactionReconcile';

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
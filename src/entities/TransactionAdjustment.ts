import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, OneToOne } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class TransactionAdjustment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Transaction)
    @JoinColumn()
    transaction!: Transaction;

    @Column({ nullable: true })
    legacyPricingOverride!: boolean;

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
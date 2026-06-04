import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import type { Pricing } from './Pricing.js';

@Entity()
export class PricingInfo {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'int' })
    userTier!: number;

    @Column({
        type: 'decimal',
        precision: 14,
        scale: 4,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    cost!: number;

    @ManyToOne('Pricing', 'items')
    @JoinColumn()
    pricing!: Relation<Pricing>;
}

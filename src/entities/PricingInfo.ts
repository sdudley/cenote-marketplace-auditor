import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pricing } from './Pricing';

@Entity()
export class PricingInfo {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
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

    @ManyToOne(() => Pricing, pricing => pricing.items)
    @JoinColumn()
    pricing!: Pricing;
}
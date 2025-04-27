import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pricing } from './Pricing';

@Entity()
export class PricingInfo {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('jsonb')
    data!: any;

    @ManyToOne(() => Pricing, pricing => pricing.items)
    @JoinColumn()
    pricing!: Pricing;
}
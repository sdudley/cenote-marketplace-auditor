import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pricing } from './Pricing';
import { PricingItem } from '../types/marketplace';
@Entity()
export class PricingInfo {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('jsonb')
    data!: PricingItem;

    @ManyToOne(() => Pricing, pricing => pricing.items)
    @JoinColumn()
    pricing!: Pricing;
}
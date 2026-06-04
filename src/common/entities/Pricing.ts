import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index, type Relation } from 'typeorm';
import type { PricingInfo } from './PricingInfo.js';

@Entity()
export class Pricing {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    @Index()
    addonKey!: string;

    @Column()
    @Index()
    deploymentType!: string;

    @Column({ type: 'boolean', default: false })
    expertDiscountOptOut!: boolean;

    @Column({ type: 'date', nullable: true })
    startDate?: string | null;

    @Column({ type: 'date', nullable: true })
    endDate?: string | null;

    @OneToMany(() => PricingInfo, (info: PricingInfo) => info.pricing)
    items!: PricingInfo[];
}
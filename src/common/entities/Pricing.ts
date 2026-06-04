import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index, type Relation } from 'typeorm';
import type { PricingInfo } from './PricingInfo.js';

@Entity()
export class Pricing {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    @Index()
    addonKey!: string;

    @Column({ type: 'varchar' })
    @Index()
    deploymentType!: string;

    @Column({ type: 'boolean', default: false })
    expertDiscountOptOut!: boolean;

    @Column({ type: 'date', nullable: true })
    startDate?: string | null;

    @Column({ type: 'date', nullable: true })
    endDate?: string | null;

    @OneToMany('PricingInfo', 'pricing')
    items!: Relation<PricingInfo>[];
}

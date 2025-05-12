import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { PricingInfo } from './PricingInfo';

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

    @Column({ type: 'date', nullable: true })
    startDate?: string;

    @Column({ type: 'date', nullable: true })
    endDate?: string;

    @OneToMany(() => PricingInfo, (info: PricingInfo) => info.pricing)
    items!: PricingInfo[];
}
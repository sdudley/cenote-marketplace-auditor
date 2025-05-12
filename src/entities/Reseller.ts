import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type ResellerMatchMode = 'exact' | 'substring';

@Entity()
export class Reseller {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({
        type: 'enum',
        enum: ['exact', 'substring'],
        default: 'substring'
    })
    matchMode!: ResellerMatchMode;

    @Column({
        type: 'decimal',
        precision: 14,
        scale: 2
    })
    discountAmount!: number;
}
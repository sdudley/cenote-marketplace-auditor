import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type ResellerMatchMode = 'exact' | 'substring';

@Entity()
export class Reseller {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

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
        scale: 4,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    discountAmount!: number;
}
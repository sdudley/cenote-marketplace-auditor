import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Addon {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', default: 'unknown' })
    parentProduct!: string;

    @Column({ type: 'varchar', nullable: true })
    productId?: string;

    @Column({ type: 'varchar', nullable: true })
    name?: string;

    @Column({ type: 'date', nullable: true })
    forgeMigrationDate?: string | null;

    @Column({ type: 'date', nullable: true })
    forgeReleaseDate?: string | null;

    @Column({ type: 'boolean', default: false })
    alwaysForge!: boolean;

    /** First sale date (inclusive) on which Cloud sales are eligible for the Forge 0% take rate promo. */
    @Column({ type: 'date', nullable: true })
    forgePromoStartDate?: string | null;

    /** Last sale date (inclusive) on which Cloud sales are eligible for the Forge 0% take rate promo. Null = still running. */
    @Column({ type: 'date', nullable: true })
    forgePromoEndDate?: string | null;

    @Column({ type: 'varchar' })
    @Index({ unique: true })
    addonKey!: string;
}
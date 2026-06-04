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

    @Column({ type: 'varchar' })
    @Index({ unique: true })
    addonKey!: string;
}
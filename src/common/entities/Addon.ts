import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Addon {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ default: 'unknown' })
    parentProduct!: string;

    @Column({ nullable: true })
    name?: string;

    @Column({ type: 'date', nullable: true })
    forgeMigrationDate?: string | null;

    @Column({ type: 'date', nullable: true })
    forgeReleaseDate?: string | null;

    @Column({ default: false })
    alwaysForge!: boolean;

    @Column()
    @Index({ unique: true })
    addonKey!: string;
}
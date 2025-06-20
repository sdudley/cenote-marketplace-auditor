import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Addon {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ default: 'unknown' })
    parentProduct!: string;

    @Column({ nullable: true })
    name?: string;

    @Column()
    @Index({ unique: true })
    addonKey!: string;
}
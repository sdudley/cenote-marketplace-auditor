import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
export class Config {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column()
    @Index({ unique: true })
    key!: string;

    @Column({
        type: 'text',
        nullable: true
    })
    stringValue?: string;

    @Column({
        type: 'float',
        nullable: true
    })
    numberValue?: number;

    @Column({
        type: 'boolean',
        nullable: true
    })
    booleanValue?: boolean;

    @Column({
        type: 'enum',
        enum: ['string', 'number', 'boolean'],
        default: 'string'
    })
    type!: 'string' | 'number' | 'boolean';

    @Column({ nullable: true })
    description?: string;
}
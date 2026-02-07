import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum JobType {
    AddonJob = 'addon',
    LicenseJob = 'license',
    PricingJob = 'pricing',
    TransactionJob = 'transaction',
    ValidationJob = 'validation',
    SenUpgradeJob = 'senUpgrade'
}

@Entity()
export class JobStatus {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({
        type: 'enum',
        enum: JobType
    })
    @Index({ unique: true })
    jobType!: JobType;

    @Column({
        type: 'timestamp with time zone',
        nullable: true
    })
    lastStartTime?: Date|null;

    @Column({
        type: 'timestamp with time zone',
        nullable: true
    })
    lastEndTime?: Date|null;

    @Column({
        type: 'boolean',
        nullable: true
    })
    lastSuccess?: boolean|null;

    @Column({
        type: 'text',
        nullable: true
    })
    lastError?: string|null;

    @Column({
        type: 'int',
        nullable: true
    })
    progressCurrent?: number|null;

    @Column({
        type: 'int',
        nullable: true
    })
    progressTotal?: number|null;
}
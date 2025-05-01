import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import { License } from './License';

@Entity()
export class LicenseVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    entitlementId!: string;

    @Column('jsonb')
    @Index('IDX_license_version_data_gin', { synchronize: false })
    data: any;

    @Column({ nullable: true })
    diff?: string;

    @ManyToOne(() => License, license => license.versions)
    license!: License;

    @OneToOne(() => LicenseVersion, { nullable: true })
    @JoinColumn()
    nextLicenseVersion?: LicenseVersion;

    @OneToOne(() => LicenseVersion, { nullable: true })
    @JoinColumn()
    priorLicenseVersion?: LicenseVersion;
}
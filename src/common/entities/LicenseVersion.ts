import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, Unique } from 'typeorm';
import { License } from './License';

@Entity()
@Unique(['license', 'version'])
export class LicenseVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    entitlementId!: string;

    @Column()
    version!: number;

    @Column('jsonb')
    @Index('IDX_license_version_data_gin', { synchronize: false })
    data: any;

    @Column({ nullable: true })
    diff?: string;

    @ManyToOne(() => License, license => license.versions)
    license!: License;
}
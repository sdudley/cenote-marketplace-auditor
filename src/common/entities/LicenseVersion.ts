import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, Unique, type Relation } from 'typeorm';
import type { License } from './License.js';

@Entity()
@Unique(['license', 'version'])
export class LicenseVersion {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'varchar' })
    @Index()
    entitlementId!: string;

    @Column({ type: 'int' })
    version!: number;

    @Column('jsonb')
    @Index('IDX_license_version_data_gin', { synchronize: false })
    data: any;

    @Column({ type: 'text', nullable: true })
    diff?: string;

    @ManyToOne('License', 'versions')
    license!: Relation<License>;
}

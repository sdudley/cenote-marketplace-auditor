import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { LicenseVersion } from './LicenseVersion';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    marketplaceLicenseId: string;

    @Column('jsonb')
    currentData: any;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => LicenseVersion, version => version.license)
    versions: LicenseVersion[];
} 
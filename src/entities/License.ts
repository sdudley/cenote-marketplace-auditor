import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { LicenseVersion } from './LicenseVersion';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    @Index()
    marketplaceLicenseId!: string;

    @Column('jsonb')
    currentData: any;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => LicenseVersion, version => version.license)
    versions!: LicenseVersion[];
}
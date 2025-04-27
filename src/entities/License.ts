import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { LicenseVersion } from './LicenseVersion';

@Entity()
export class License {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @Column()
    @Index()
    marketplaceLicenseId!: string;

    @Column('jsonb')
    currentData: any;

    @OneToMany(() => LicenseVersion, version => version.license)
    versions!: LicenseVersion[];
}
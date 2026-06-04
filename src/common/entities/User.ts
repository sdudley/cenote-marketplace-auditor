import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserType } from '#common/types/userType.js';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ type: 'varchar' })
    @Index({ unique: true })
    email!: string;

    @Column({ type: 'varchar' })
    passwordHash!: string;

    @Column({
        type: 'varchar',
        default: UserType.User
    })
    userType!: string;
}


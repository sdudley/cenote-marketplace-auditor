import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserType } from '#common/types/userType';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column()
    @Index({ unique: true })
    email!: string;

    @Column()
    passwordHash!: string;

    @Column({
        type: 'varchar',
        default: UserType.User
    })
    userType!: string;
}


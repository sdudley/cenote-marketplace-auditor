import { injectable, inject } from 'inversify';
import { DataSource, Repository } from 'typeorm';
import { TYPES } from '../../config/types';
import { User } from '#common/entities/User';
import { UserType } from '#common/types/userType';
import bcrypt from 'bcrypt';

@injectable()
export class UserDao {
    private repository: Repository<User>;

    constructor(
        @inject(TYPES.DataSource) dataSource: DataSource
    ) {
        this.repository = dataSource.getRepository(User);
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.repository.findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return await this.repository.findOne({ where: { id } });
    }

    async create(email: string, password: string, userType: UserType = UserType.User): Promise<User> {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User();
        user.email = email;
        user.passwordHash = passwordHash;
        user.userType = userType;
        return await this.repository.save(user);
    }

    async verifyPassword(user: User, password: string): Promise<boolean> {
        return await bcrypt.compare(password, user.passwordHash);
    }

    async count(): Promise<number> {
        return await this.repository.count();
    }

    async updatePassword(user: User, newPassword: string): Promise<void> {
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.repository.save(user);
    }

    async findAll(skip: number = 0, take: number = 25): Promise<{ users: User[]; total: number }> {
        const [users, total] = await this.repository.findAndCount({
            skip,
            take,
            order: { email: 'ASC' }
        });
        return { users, total };
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);
        return (result.affected ?? 0) > 0;
    }
}


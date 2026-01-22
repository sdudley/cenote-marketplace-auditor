import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { UserDao } from '../../database/dao/UserDao';
import { UserType } from '#common/types/userType';
import { validatePassword, validatePasswordLength } from '#common/util/passwordValidation';

@injectable()
export class UserRoute {
    private router: Router;

    constructor(
        @inject(TYPES.UserDao) private userDao: UserDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Create user
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const { email, userType, password, confirmPassword } = req.body;

                if (!email || !password || !confirmPassword) {
                    return res.status(400).json({ error: 'Email, password, and confirm password are required' });
                }

                const passwordValidation = validatePassword(password, confirmPassword);
                if (!passwordValidation.isValid) {
                    return res.status(400).json({ error: passwordValidation.error });
                }

                // Validate userType
                if (userType !== UserType.User && userType !== UserType.Admin) {
                    return res.status(400).json({ error: 'Invalid user type' });
                }

                // Check if email is already taken
                const existingUser = await this.userDao.findByEmail(email);
                if (existingUser) {
                    return res.status(400).json({ error: 'Email already registered' });
                }

                const user = await this.userDao.create(email, password, userType as UserType);

                // Don't return password hash
                const userResponse = {
                    id: user.id,
                    email: user.email,
                    userType: user.userType,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                };

                res.status(201).json(userResponse);
            } catch (error) {
                console.error('Error creating user:', error);
                res.status(500).json({ error: 'Failed to create user' });
            }
        });

        // List users with pagination
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const page = parseInt(req.query.page as string) || 0;
                const pageSize = parseInt(req.query.pageSize as string) || 25;
                const skip = page * pageSize;

                const { users, total } = await this.userDao.findAll(skip, pageSize);

                // Don't return password hashes
                const usersResponse = users.map(user => ({
                    id: user.id,
                    email: user.email,
                    userType: user.userType,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }));

                res.json({
                    users: usersResponse,
                    total,
                    page,
                    pageSize
                });
            } catch (error) {
                console.error('Error fetching users:', error);
                res.status(500).json({ error: 'Failed to fetch users' });
            }
        });

        // Delete user
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const userId = req.params.id;
                const currentUserId = (req.user as any)?.id;

                // Prevent self-deletion
                if (userId === currentUserId) {
                    return res.status(400).json({ error: 'Cannot delete your own account' });
                }

                const deleted = await this.userDao.delete(userId);
                if (!deleted) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.status(204).send();
            } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).json({ error: 'Failed to delete user' });
            }
        });

        // Reset user password
        this.router.post('/:id/reset-password', async (req: Request, res: Response) => {
            try {
                const userId = req.params.id;
                const { newPassword } = req.body;

                if (!newPassword) {
                    return res.status(400).json({ error: 'New password is required' });
                }

                const passwordValidation = validatePasswordLength(newPassword);
                if (!passwordValidation.isValid) {
                    return res.status(400).json({ error: passwordValidation.error });
                }

                const user = await this.userDao.findById(userId);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                await this.userDao.updatePassword(user, newPassword);

                res.json({ message: 'Password reset successfully' });
            } catch (error) {
                console.error('Error resetting password:', error);
                res.status(500).json({ error: 'Failed to reset password' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}


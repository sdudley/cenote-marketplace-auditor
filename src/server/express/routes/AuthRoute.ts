import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { UserDao } from '../../database/dao/UserDao';
import { UserType } from '#common/types/userType';
import { validatePassword } from '#common/util/passwordValidation';
import passport from 'passport';

@injectable()
export class AuthRoute {
    private router: Router;

    constructor(
        @inject(TYPES.UserDao) private userDao: UserDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Check authentication status
        this.router.get('/status', async (req: Request, res: Response) => {
            if (req.isAuthenticated()) {
                const user = req.user as { id: string; email: string; userType: string };
                // Fetch full user to get userType
                const fullUser = await this.userDao.findById(user.id);
                if (fullUser) {
                    res.json({
                        authenticated: true,
                        user: { id: fullUser.id, email: fullUser.email, userType: fullUser.userType }
                    });
                } else {
                    res.json({ authenticated: false });
                }
            } else {
                res.json({ authenticated: false });
            }
        });

        // Check if setup is needed (no users exist)
        this.router.get('/setup-required', async (req: Request, res: Response) => {
            try {
                const userCount = await this.userDao.count();
                res.json({ setupRequired: userCount === 0 });
            } catch (error) {
                console.error('Error checking setup status:', error);
                res.status(500).json({ error: 'Failed to check setup status' });
            }
        });

        // Login endpoint
        this.router.post('/login', (req: Request, res: Response, next: any) => {
            passport.authenticate('local', (err: any, user: any, info: any) => {
                if (err) {
                    return res.status(500).json({ error: 'Authentication error' });
                }
                if (!user) {
                    return res.status(401).json({ error: info?.message || 'Invalid credentials' });
                }
                req.logIn(user, (loginErr) => {
                    if (loginErr) {
                        return res.status(500).json({ error: 'Login error' });
                    }

                    // Set cookie maxAge based on "Remember Me"
                    const rememberMe = req.body.rememberMe === true;
                    if (rememberMe && req.session) {
                        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                    } else if (req.session) {
                        req.session.cookie.maxAge = undefined; // Session cookie (expires when browser closes)
                    }

                    // Save the session before sending response
                    req.session?.save((saveErr) => {
                        if (saveErr) {
                            console.error('Error saving session:', saveErr);
                            return res.status(500).json({ error: 'Session save error' });
                        }

                        const userResponse = { id: user.id, email: user.email, userType: user.userType };
                        return res.json({
                            authenticated: true,
                            user: userResponse
                        });
                    });
                });
            })(req, res, next);
        });

        // Logout endpoint
        this.router.post('/logout', (req: Request, res: Response) => {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ error: 'Logout error' });
                }
                req.session?.destroy((destroyErr) => {
                    if (destroyErr) {
                        return res.status(500).json({ error: 'Session destruction error' });
                    }
                    res.clearCookie('connect.sid');
                    res.json({ authenticated: false });
                });
            });
        });

        // Setup endpoint (create first user)
        this.router.post('/setup', async (req: Request, res: Response) => {
            try {
                const userCount = await this.userDao.count();
                if (userCount > 0) {
                    return res.status(403).json({ error: 'Setup already completed' });
                }

                const { email, password, confirmPassword } = req.body;

                if (!email || !password || !confirmPassword) {
                    return res.status(400).json({ error: 'Email, password, and confirm password are required' });
                }

                const passwordValidation = validatePassword(password, confirmPassword);
                if (!passwordValidation.isValid) {
                    return res.status(400).json({ error: passwordValidation.error });
                }

                // Check if email is already taken (shouldn't happen, but just in case)
                const existingUser = await this.userDao.findByEmail(email);
                if (existingUser) {
                    return res.status(400).json({ error: 'Email already registered' });
                }

                // First user is always admin
                const user = await this.userDao.create(email, password, UserType.Admin);

                // Auto-login after setup
                req.logIn(user, (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Auto-login failed' });
                    }
                    // Save the session before sending response
                    req.session?.save((saveErr) => {
                        if (saveErr) {
                            console.error('Error saving session:', saveErr);
                            return res.status(500).json({ error: 'Session save error' });
                        }
                        const userResponse = { id: user.id, email: user.email, userType: user.userType };
                        res.json({
                            authenticated: true,
                            user: userResponse
                        });
                    });
                });
            } catch (error) {
                console.error('Error during setup:', error);
                res.status(500).json({ error: 'Failed to create account' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}


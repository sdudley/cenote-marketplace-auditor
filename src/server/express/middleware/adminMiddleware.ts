import { Request, Response, NextFunction } from 'express';
import { isAdmin } from '#common/util/userUtils';
import { User } from '#common/entities/User';

/**
 * Middleware factory that returns a middleware function to require admin access.
 * Since Passport deserializes the full User entity into req.user, we can check
 * userType directly without needing to query the database.
 */
export function requireAdmin() {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.isAuthenticated()) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Passport deserializes the full User entity, so we can check userType directly
        const user = req.user as User;
        if (!user || !isAdmin(user.userType)) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        next();
    };
}


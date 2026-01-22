import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Container } from 'inversify';
import { TYPES } from '../../config/types';
import { UserDao } from '../../database/dao/UserDao';
import { User } from '#common/entities/User';

export function configurePassport(container: Container): void {
    const userDao = container.get<UserDao>(TYPES.UserDao);

    // Serialize user for session
    passport.serializeUser((user: Express.User, done) => {
        done(null, (user as User).id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await userDao.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    // Configure local strategy
    passport.use(new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email: string, password: string, done) => {
            try {
                const user = await userDao.findByEmail(email);
                if (!user) {
                    return done(null, false, { message: 'Invalid email or password' });
                }

                const isValid = await userDao.verifyPassword(user, password);
                if (!isValid) {
                    return done(null, false, { message: 'Invalid email or password' });
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    ));
}


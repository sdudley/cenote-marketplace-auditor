import crypto from 'crypto';
import { ConfigDao } from '../database/dao/ConfigDao';

const SESSION_SECRET_CONFIG_KEY = 'SessionSecret';

/**
 * Gets or generates a session secret from the database.
 *
 * Priority:
 * 1. SESSION_SECRET environment variable (if set)
 * 2. Existing SessionSecret config value in database (if exists)
 * 3. Generate new secret and save to database
 *
 * @param configDao The ConfigDao instance to use for database operations
 * @returns The session secret to use
 */
export async function getSessionSecret(configDao: ConfigDao): Promise<string> {
    // Use environment variable if provided
    if (process.env.SESSION_SECRET) {
        return process.env.SESSION_SECRET;
    }

    // Try to read from database
    try {
        const existingSecret = await configDao.get<string>(SESSION_SECRET_CONFIG_KEY);
        if (existingSecret && existingSecret.length > 0) {
            return existingSecret;
        }
    } catch (error) {
        console.warn('Warning: Could not read session secret from database, generating new one:', error);
    }

    // Generate a new secure random secret
    const secret = crypto.randomBytes(64).toString('hex');

    // Save to database for future use
    try {
        await configDao.set(SESSION_SECRET_CONFIG_KEY, secret, 'Session secret for express-session. Automatically generated if not set via SESSION_SECRET environment variable.');
        console.log('Generated new session secret and saved to database');
    } catch (error) {
        console.error('Error: Could not save session secret to database:', error);
        console.warn('Session secret will be regenerated on each restart. Consider setting SESSION_SECRET environment variable.');
    }

    return secret;
}


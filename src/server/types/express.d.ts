import { User } from '#common/entities/User.js';

declare global {
    namespace Express {
        interface User extends User {}
    }
}

export {};


import { User } from '#common/entities/User';

declare global {
    namespace Express {
        interface User extends User {}
    }
}

export {};


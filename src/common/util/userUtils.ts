import { UserType } from '#common/types/userType.js';

export function isAdmin(userType: string): boolean {
    return userType === UserType.Admin;
}


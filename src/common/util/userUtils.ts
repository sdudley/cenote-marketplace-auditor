import { UserType } from '#common/types/userType';

export function isAdmin(userType: string): boolean {
    return userType === UserType.Admin;
}


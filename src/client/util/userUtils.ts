export enum UserType {
    User = 'user',
    Admin = 'admin'
}

export function isAdmin(userType: string): boolean {
    return userType === UserType.Admin;
}


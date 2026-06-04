declare module 'connect-pg-simple' {
  import type session from 'express-session';

  interface PgSessionOptions {
    conString?: string;
    tableName?: string;
    createTableIfMissing?: boolean;
  }

  function connectPgSimple(sessionModule: typeof session): new (options?: PgSessionOptions) => session.Store;

  export default connectPgSimple;
}

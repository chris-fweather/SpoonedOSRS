declare namespace Cloudflare {
  interface Env {
    /** Local development only; production handler always rejects this route. */
    LOCAL_PREVIEW_LOGIN?: string;
    DB?: D1Database;
    SYNC_PAUSED?: string;
    API_READ_LIMIT?: {limit(input:{key:string}):Promise<{success:boolean}>};
    API_WRITE_LIMIT?: {limit(input:{key:string}):Promise<{success:boolean}>};
    ASSETS?: Fetcher;
    /** R2 bucket for guide images (spoonedosrs-uploads / spoonedosrs-dev-uploads). Absent until the bucket exists. */
    UPLOADS?: R2Bucket;
    /** Public Discord OAuth client id. Wrangler var, not a secret. */
    DISCORD_CLIENT_ID?: string;
    /** Worker secret. Never store the value in the repo. */
    DISCORD_CLIENT_SECRET?: string;
    /** Worker secret used to sign the session cookie. Never store the value in the repo. */
    SESSION_SECRET?: string;
    /** Worker secret that signs post-deploy sync checks (/api/health/sync). */
    DEPLOY_CHECK_SECRET?: string;
    /** Read-only Discord role bridge secret; distinct from OAuth and sessions. */
    DISCORD_ROLE_SYNC_SECRET?: string;
    /** Dev environment only: the owner's sign-in password (Worker secret). Ignored everywhere else. */
    DEV_LOGIN_PASSWORD?: string;
  }
}

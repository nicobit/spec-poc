// src/auth/jwt.ts
export type JwtClaims = {
  roles?: string[];
  scp?: string;
  name?: string;
  preferred_username?: string;
  oid?: string; // user object id
  tid?: string; // tenant id
  [k: string]: any;
};

export function decodeJwt<T = JwtClaims>(token: string): T {
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent(escape(json)));
}

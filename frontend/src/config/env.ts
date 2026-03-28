type EnvKey =
  | "VITE_API_BASE_URL"
  | "VITE_TENANT_ID"
  | "VITE_REDIRECT_URI"
  | "VITE_CLIENT_ID"
  | "VITE_API_CLIENT_ID";

type OptionalEnvKey = "VITE_THEME_ID" | "VITE_THEME_MODE";

const DEV_DEFAULTS: Record<EnvKey, string> = {
  VITE_API_BASE_URL: "http://localhost:7071/api",
  VITE_TENANT_ID: "00000000-0000-0000-0000-000000000000",
  VITE_REDIRECT_URI: "http://localhost:5174/",
  VITE_CLIENT_ID: "00000000-0000-0000-0000-000000000000",
  VITE_API_CLIENT_ID: "00000000-0000-0000-0000-000000000000",
};

const warnedKeys = new Set<string>();

const readRequired = (key: EnvKey): string => {
  const value = import.meta.env[key];
  if (value) {
    return value;
  }

  if (import.meta.env.DEV) {
    const fallback = DEV_DEFAULTS[key];
    if (!warnedKeys.has(key)) {
      warnedKeys.add(key);
      console.warn(
        `[env] Missing ${key}. Falling back to the local development default. ` +
          "Add the value to frontend/.env.local to override it."
      );
    }
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${key}`);
};

const readOptional = (key: OptionalEnvKey): string | undefined => {
  const value = import.meta.env[key];
  return value || undefined;
};

export const env = {
  apiBaseUrl: readRequired("VITE_API_BASE_URL"),
  tenantId: readRequired("VITE_TENANT_ID"),
  redirectUri: readRequired("VITE_REDIRECT_URI"),
  clientId: readRequired("VITE_CLIENT_ID"),
  apiClientId: readRequired("VITE_API_CLIENT_ID"),
  themeId: readOptional("VITE_THEME_ID"),
  themeMode: readOptional("VITE_THEME_MODE"),
} as const;

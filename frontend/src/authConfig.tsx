import { env } from "./config/env";

export const msalConfig = {
  auth: {
    clientId: env.clientId,
    authority: `https://login.microsoftonline.com/${env.tenantId}`,
    redirectUri: env.redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage" as const,
    storeAuthStateInCookie: false,
  },

  
};

export const apiScope = `api://${env.apiClientId}/user_impersonation`;

//scopes: ["openid", "profile","https://management.azure.com/.default"],
// scopes: ["openid", "profile", apiScope],
export const loginRequest = {
 scopes: ["openid", "profile", apiScope],
  //scopes: ["openid", "profile","https://management.azure.com/.default"],
};

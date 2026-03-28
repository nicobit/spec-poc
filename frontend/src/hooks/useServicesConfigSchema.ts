import { useEffect, useState } from "react";
import { IPublicClientApplication } from "@azure/msal-browser";
import { getConfigSchema } from "@/features/health/api/health_config";

/**
 * Loads the backend JSON Schema and registers Monaco JSON diagnostics.
 * Returns the schema object (for AJV etc., if you want).
 */
export function useServicesConfigSchema(instance: IPublicClientApplication) {
  const [schema, setSchema] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, monaco] = await Promise.all([
          getConfigSchema(instance),
          import("monaco-editor"),
        ]);
        if (!alive) return;
        setSchema(s);
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          enableSchemaRequest: false,
          schemas: [
            {
              uri: "inmemory://services-config.schema.json",
              fileMatch: ["*"], // apply to all JSON editors; optionally scope with custom language ID
              schema: s,
            },
          ],
        });
      } catch {
        // noop; editor will still work
      }
    })();
    return () => {
      alive = false;
    };
  }, [instance]);

  return schema;
}

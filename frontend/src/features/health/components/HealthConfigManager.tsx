import React, { useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from '@/components/ConfirmDialog';
import { IPublicClientApplication } from "@azure/msal-browser";
import { enqueueSnackbar } from "notistack";
import { Edit2, Trash2, X, Loader2, Plus, Save, RefreshCcw, CheckCircle2, Shield, HelpCircle } from "lucide-react";
import LazyMonacoEditor from "@/shared/ui/LazyMonacoEditor";
import { useTailwindDarkMode } from "@/hooks/useTailwindDarkMode";
import {
  HealthConfigApi,
  ServiceConfig,
  ServicesConfig,
  StoredConfig,
  validateConfig, // server-side validator
} from "@/features/health/api/health_config";
import { SERVICE_TEMPLATES } from "@/features/health/templates/serviceTemplates";
import { useServicesConfigSchema } from "@/hooks/useServicesConfigSchema"; // registers Monaco JSON schema diagnostics

type Props = { instance: IPublicClientApplication };

const pretty = (obj: unknown) => JSON.stringify(obj, null, 2);

export default function HealthConfigManager({ instance }: Props) {
  const api = useMemo(() => new HealthConfigApi(instance), [instance]);
  const isDark = useTailwindDarkMode();

  // register Monaco JSON schema diagnostics (once)
  useServicesConfigSchema(instance);

  // top loading bar
  const [loading, setLoading] = useState(false);

  const [stored, setStored] = useState<StoredConfig | null>(null);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [defaultTimeout, setDefaultTimeout] = useState<number | "">("");

  // Help modal
  const [helpOpen, setHelpOpen] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newSvc, setNewSvc] = useState<ServiceConfig>({ name: "", type: "", enabled: true, config: {} });
  const [newSvcConfig, setNewSvcConfig] = useState<string>("{}");
  const createEditorRef = useRef<any>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null);
  const [current, setCurrent] = useState<ServiceConfig | null>(null);
  const [currentJson, setCurrentJson] = useState<string>("{}");
  const editEditorRef = useRef<any>(null);

  // Monaco config
  useEffect(() => {
    let mounted = true;

    void import("monaco-editor").then((monaco) => {
      if (!mounted) return;
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const sc = await api.getConfig();
      const list = await api.listServices();
      setStored(sc);
      setServices(list);
      setDefaultTimeout(sc.config.default_timeout_seconds ?? "");
    } catch (e: any) {
      enqueueSnackbar(`Error loading configuration: ${e?.message || e}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure Monaco lays out when modals open or window resizes
  useEffect(() => {
    if (editOpen) requestAnimationFrame(() => editEditorRef.current?.layout());
  }, [editOpen]);
  useEffect(() => {
    if (createOpen) requestAnimationFrame(() => createEditorRef.current?.layout());
  }, [createOpen]);
  useEffect(() => {
    const onResize = () => {
      editEditorRef.current?.layout();
      createEditorRef.current?.layout();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* -------------------- Create -------------------- */
  const openCreate = () => {
    setNewSvc({ name: "", type: "", enabled: true, config: {} });
    setNewSvcConfig("{}");
    setCreateOpen(true);
  };

  const saveCreate = async () => {
    setLoading(true);
    try {
      let parsed: any;
      try {
        parsed = newSvcConfig.trim() ? JSON.parse(newSvcConfig) : {};
      } catch (err: any) {
        enqueueSnackbar(`Invalid JSON: ${err?.message || err}`, { variant: "error" });
        return;
      }
      if (!newSvc.name.trim() || !newSvc.type.trim()) {
        enqueueSnackbar("Name and type are required.", { variant: "warning" });
        return;
      }
      // validate single-service config against backend schema
      const res = await validateConfig(instance, { services: [{ ...newSvc, config: parsed }] });
      if (!res.ok) {
        const msg = res.errors.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("\n");
        enqueueSnackbar(msg || "Validation failed", { variant: "error" });
        return;
      }
      await api.addService({ ...newSvc, config: parsed });
      enqueueSnackbar("Service created.", { variant: "success" });
      setCreateOpen(false);
      await loadAll();
    } catch (err: any) {
      enqueueSnackbar(
        err?.status === 409 ? "Conflict (ETag or duplicate name). Refresh and try again." : err?.message || "Add failed",
        { variant: "error" }
      );
    } finally {
      setLoading(false);
    }
  };

  const validateCreateJson = async () => {
    try {
      const parsed = newSvcConfig.trim() ? JSON.parse(newSvcConfig) : {};
      const res = await validateConfig(instance, { services: [{ ...newSvc, config: parsed }] });
      if (res.ok) enqueueSnackbar("Looks valid ✅", { variant: "success" });
      else enqueueSnackbar(res.errors.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("\n"), { variant: "error" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Validation error", { variant: "error" });
    }
  };

  /* -------------------- Edit -------------------- */
  const openEdit = (svc: ServiceConfig) => {
    setEditingOriginalName(svc.name);
    setCurrent(JSON.parse(JSON.stringify(svc)));
    setCurrentJson(pretty(svc.config));
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!current || !editingOriginalName) return;
    setLoading(true);
    try {
      let parsed: any;
      try {
        parsed = currentJson.trim() ? JSON.parse(currentJson) : {};
      } catch (err: any) {
        enqueueSnackbar(`Invalid JSON: ${err?.message || err}`, { variant: "error" });
        return;
      }
      if (!current.name.trim() || !current.type.trim()) {
        enqueueSnackbar("Name and type are required.", { variant: "warning" });
        return;
      }
      // validate before save
      const res = await validateConfig(instance, { services: [{ ...current, config: parsed }] });
      if (!res.ok) {
        const msg = res.errors.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("\n");
        enqueueSnackbar(msg || "Validation failed", { variant: "error" });
        return;
      }
      await api.updateService(editingOriginalName, { ...current, config: parsed });
      enqueueSnackbar("Service updated.", { variant: "success" });
      setEditOpen(false);
      await loadAll();
    } catch (err: any) {
      enqueueSnackbar(
        err?.status === 409 ? "Conflict (ETag changed). Refresh and try again." : err?.message || "Update failed",
        { variant: "error" }
      );
    } finally {
      setLoading(false);
    }
  };

  const validateEditJson = async () => {
    if (!current) return;
    try {
      const parsed = currentJson.trim() ? JSON.parse(currentJson) : {};
      const res = await validateConfig(instance, { services: [{ ...current, config: parsed }] });
      if (res.ok) enqueueSnackbar("Looks valid ✅", { variant: "success" });
      else enqueueSnackbar(res.errors.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("\n"), { variant: "error" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Validation error", { variant: "error" });
    }
  };

  /* -------------------- Delete -------------------- */
  const handleDelete = async (name: string) => {
    setConfirmState({ open: true, title: 'Delete service', message: `Delete service "${name}"?`, onConfirm: async () => {
      setLoading(true);
      try {
        await api.deleteService(name);
        enqueueSnackbar("Service deleted.", { variant: "success" });
        await loadAll();
      } catch (err: any) {
        enqueueSnackbar(
          err?.status === 409 ? "Conflict (ETag changed). Refresh and try again." : err?.message || "Delete failed",
          { variant: "error" }
        );
      } finally {
        setLoading(false);
      }
    } });
  };

  const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message?: string; onConfirm?: () => Promise<void> }>(() => ({ open: false }));

  /* -------------------- Global save -------------------- */
  const saveGlobal = async () => {
    setLoading(true);
    try {
      const cfg: ServicesConfig = {
        default_timeout_seconds: defaultTimeout === "" ? undefined : Number(defaultTimeout),
        services,
      };
      // Validate whole config before save (optional but helpful)
      const res = await validateConfig(instance, cfg as any);
      if (!res.ok) {
        enqueueSnackbar(res.errors.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("\n"), { variant: "error" });
        return;
      }
      await api.putConfig(cfg);
      enqueueSnackbar("Global configuration saved.", { variant: "success" });
      await loadAll();
    } catch (err: any) {
      enqueueSnackbar(err?.status === 409 ? "Conflict (ETag changed). Refresh and try again." : err?.message || "Save failed", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 relative">
      {/* Loading bar */}
      {loading ? <div className="h-1 bg-indigo-600 dark:bg-indigo-500 animate-pulse" /> : <div className="h-1" />}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mt-4 mb-3">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">default_timeout_seconds</label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 3.5"
            value={defaultTimeout}
            onChange={(e) => setDefaultTimeout(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-40 border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Show configuration instructions"
            title="Show configuration instructions"
          >
            <HelpCircle className="w-4 h-4" />
            Help
          </button>

          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={saveGlobal}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
        </div>
      </div>

      {/* ETag */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        ETag: <code>{stored?.etag || "—"}</code>
      </div>

      {/* Services Table */}
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Type</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Enabled</th>
              <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-200" colSpan={2}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
            {services.map((svc) => (
              <tr key={svc.name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100 whitespace-normal break-words">
                  <code>{svc.name}</code>
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100 whitespace-normal break-words">{svc.type}</td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">{svc.enabled ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => openEdit(svc)} className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none" aria-label="Edit">
                    <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(svc.name)}
                    className="p-1 hover:text-red-600 dark:hover:text-red-400 focus:outline-none"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No services configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editOpen && current && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 w-[90vw] h-[85vh] rounded shadow-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Service</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 focus:outline-none" aria-label="Close">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">name</label>
                  <input
                    value={current.name}
                    onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">type</label>
                  <input
                    value={current.type}
                    onChange={(e) => setCurrent({ ...current, type: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={current.enabled}
                      onChange={(e) => setCurrent({ ...current, enabled: e.target.checked })}
                      className="rounded"
                    />
                    enabled
                  </label>
                </div>
              </div>

              {/* Editor toolbar */}
              <div className="flex items-center justify-between">
                <TemplateSelector
                  onApply={(tmplKey) => {
                    const tmpl = SERVICE_TEMPLATES[tmplKey];
                    if (!tmpl) return;
                    // apply only config for edit (don't clobber name/type/enabled unless empty)
                    const merged = {
                      ...current,
                      type: (current?.type || tmpl.type) as string,
                      enabled: (current?.enabled ?? tmpl.enabled) as boolean,
                      config: tmpl.config,
                    } as ServiceConfig;
                    setCurrent(merged);
                    setCurrentJson(pretty(tmpl.config));
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={validateEditJson}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    <Shield className="w-4 h-4" />
                    Validate
                  </button>
                </div>
              </div>

              {/* Editor wrapper with full-height */}
              <div className="flex-1 min-h-[50vh] border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                <LazyMonacoEditor
                  key={isDark ? "dark" : "light"} // force theme reflow
                  language="json"
                  theme={isDark ? "vs-dark" : "vs"}
                  value={currentJson}
                  width="100%"
                  height="100%"
                  options={{ automaticLayout: true, minimap: { enabled: false } }}
                  editorDidMount={(editor: any) => {
                    editEditorRef.current = editor;
                    requestAnimationFrame(() => editor.layout());
                  }}
                  onChange={(val: string | undefined) => setCurrentJson(val || "{}")}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none">
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 w-[90vw] h-[85vh] rounded shadow-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create New Service</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 focus:outline-none" aria-label="Close">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">name</label>
                  <input
                    value={newSvc.name}
                    onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                    placeholder="unique-name"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">type</label>
                  <input
                    value={newSvc.type}
                    onChange={(e) => setNewSvc({ ...newSvc, type: e.target.value })}
                    placeholder="sql_db | key_vault | storage_blob | storage_table | azure_openai | ai_search | service_bus"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={newSvc.enabled}
                      onChange={(e) => setNewSvc({ ...newSvc, enabled: e.target.checked })}
                      className="rounded"
                    />
                    enabled
                  </label>
                </div>
              </div>

              {/* Editor toolbar */}
              <div className="flex items-center justify-between">
                <TemplateSelector
                  onApply={(tmplKey) => {
                    const tmpl = SERVICE_TEMPLATES[tmplKey];
                    if (!tmpl) return;
                    setNewSvc((s) => ({
                      ...s,
                      // don't clobber user's manual entries unless empty
                      type: s.type || tmpl.type,
                      enabled: s.enabled ?? tmpl.enabled,
                      config: tmpl.config,
                    }));
                    setNewSvcConfig(pretty(tmpl.config));
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={validateCreateJson}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    <Shield className="w-4 h-4" />
                    Validate
                  </button>
                </div>
              </div>

              {/* Editor wrapper with full-height */}
              <div className="flex-1 min-h-[50vh] border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                <LazyMonacoEditor
                  key={isDark ? "dark" : "light"}
                  language="json"
                  theme={isDark ? "vs-dark" : "vs"}
                  value={newSvcConfig}
                  width="100%"
                  height="100%"
                  options={{ automaticLayout: true, minimap: { enabled: false } }}
                  editorDidMount={(editor: any) => {
                    createEditorRef.current = editor;
                    requestAnimationFrame(() => editor.layout());
                  }}
                  onChange={(val: string | undefined) => setNewSvcConfig(val || "{}")}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none">
                Cancel
              </button>
              <button
                onClick={saveCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help / Instructions Modal */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      
      {loading && (
        <div className="fixed bottom-4 right-4 p-2 rounded-full bg-indigo-600 text-white shadow-lg">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={async () => {
        const h = confirmState.onConfirm;
        setConfirmState({ open: false });
        if (h) await h();
      }} onCancel={() => setConfirmState({ open: false })} />
    </div>
  );
}

/* -------------------- Template selector -------------------- */

function TemplateSelector({ onApply }: { onApply: (key: string) => void }) {
  const [val, setVal] = useState<string>("");
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-700 dark:text-gray-300">Template</label>
      <select
        value={val}
        onChange={(e) => {
          const key = e.target.value;
          setVal(key);
          if (key) onApply(key);
        }}
        className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-sm"
      >
        <option value="">Insert template…</option>
        <option value="sql_db">SQL Database</option>
        <option value="key_vault">Key Vault</option>
        <option value="storage_blob">Storage Blob</option>
        <option value="storage_table">Storage Table</option>
        <option value="azure_openai">Azure OpenAI</option>
        <option value="ai_search">Azure AI Search</option>
        <option value="service_bus_queue">Service Bus — Queue</option>
        <option value="service_bus_subscription">Service Bus — Subscription</option>
      </select>
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <CheckCircle2 className="w-4 h-4" />
        Validates against backend schema
      </span>
    </div>
  );
}

/* -------------------- Help Modal -------------------- */

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 w-[92vw] max-w-5xl h-[85vh] rounded shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">How to configure service checks</h3>
          </div>
          <button onClick={onClose} className="p-1 focus:outline-none" aria-label="Close">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6 text-sm text-gray-800 dark:text-gray-200">
          <section>
            <h4 className="font-semibold mb-2">Field sources</h4>
            <p className="mb-2">Each property under <code>config</code> can reference values in three ways:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>inline</strong> — literal value inside the JSON.</li>
              <li><strong>settings</strong> — read from application settings / environment variables.</li>
              <li><strong>kv</strong> — read from Azure Key Vault secret.</li>
            </ul>

            <div className="grid md:grid-cols-3 gap-3 mt-3">
              <CodeCard title="inline">
{`{ "source": "inline", "value": "https://example.net" }`}
              </CodeCard>
              <CodeCard title="settings">
{`{ "source": "settings", "setting_name": "AI_SEARCH_ENDPOINT" }`}
              </CodeCard>
              <CodeCard title="kv (Key Vault)">
{`{
  "source": "kv",
  "key_vault": {
    "vault_uri": "https://my-vault.vault.azure.net/",
    "secret_name": "sql-connstr"
  }
}`}
              </CodeCard>
            </div>

            <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              Tip: booleans like <code>live_call</code> accept <code>true/false</code>. If sent as strings,
              common truthy values (<code>"1"</code>, <code>"true"</code>, <code>"yes"</code>) are normalized by the backend.
            </p>
          </section>

          <section>
            <h4 className="font-semibold mb-2">Service types & required config</h4>

            <ServiceBlock
              name="sql_db"
              required={["config.conn_str"]}
              example={
`{
  "name": "sql",
  "type": "sql_db",
  "enabled": true,
  "config": {
    "conn_str": { "source": "settings", "setting_name": "SQL_CONNECTION_STRING" }
  }
}`}
            />

            <ServiceBlock
              name="key_vault"
              required={["config.vault_uri"]}
              optional={["config.test_secret_name"]}
              example={
`{
  "name": "kv",
  "type": "key_vault",
  "enabled": true,
  "config": {
    "vault_uri": { "source": "settings", "setting_name": "KEY_VAULT_URI" },
    "test_secret_name": { "source": "inline", "value": "health-probe-secret" }
  }
}`}
            />

            <ServiceBlock
              name="storage_blob"
              required={["config.connection_string  OR  (config.endpoint + config.container)"]}
              example={
`{
  "name": "blob",
  "type": "storage_blob",
  "enabled": true,
  "config": {
    // Option A: connection string
    // "connection_string": { "source": "kv", "key_vault": { "vault_uri": "https://my-vault.vault.azure.net/", "secret_name": "blob-connstr" } },

    // Option B: endpoint + container (Managed Identity assumed)
    "endpoint": { "source": "settings", "setting_name": "BLOB_ENDPOINT" },
    "container": { "source": "inline", "value": "my-container" }
  }
}`}
            />

            <ServiceBlock
              name="storage_table"
              required={["config.connection_string  OR  (config.endpoint + config.table_name)"]}
              example={
`{
  "name": "table",
  "type": "storage_table",
  "enabled": true,
  "config": {
    // "connection_string": { "source": "settings", "setting_name": "STORAGE_CONNSTR" },
    "endpoint": { "source": "settings", "setting_name": "TABLES_ENDPOINT" },
    "table_name": { "source": "inline", "value": "healthTable" }
  }
}`}
            />

            <ServiceBlock
              name="azure_openai"
              required={["config.endpoint"]}
              optional={["config.api_version", "config.live_call", "config.deployment"]}
              example={
`{
  "name": "aoai",
  "type": "azure_openai",
  "enabled": true,
  "config": {
    "endpoint": { "source": "settings", "setting_name": "AZURE_OPENAI_ENDPOINT" },
    "api_version": { "source": "inline", "value": "2024-10-21" },
    "live_call": { "source": "inline", "value": false },
    "deployment": { "source": "settings", "setting_name": "AZURE_OPENAI_DEPLOYMENT" }
  }
}`}
            />

            <ServiceBlock
              name="ai_search"
              required={["config.endpoint", "config.index_name"]}
              example={
`{
  "name": "search",
  "type": "ai_search",
  "enabled": true,
  "config": {
    "endpoint": { "source": "settings", "setting_name": "AI_SEARCH_ENDPOINT" },
    "index_name": { "source": "settings", "setting_name": "AI_SEARCH_INDEX" }
  }
}`}
            />

            <ServiceBlock
              name="service_bus (queue)"
              required={["config.namespace", "config.entity.type='queue'", "config.entity.queue_name"]}
              example={
`{
  "name": "sbq",
  "type": "service_bus",
  "enabled": true,
  "config": {
    "namespace": { "source": "settings", "setting_name": "SERVICEBUS_NAMESPACE" },
    "entity": {
      "type": "queue",
      "queue_name": { "source": "inline", "value": "orders" }
    }
  }
}`}
            />

            <ServiceBlock
              name="service_bus (subscription)"
              required={["config.namespace", "config.entity.type='subscription'", "config.entity.topic_name", "config.entity.subscription_name"]}
              example={
`{
  "name": "sbs",
  "type": "service_bus",
  "enabled": true,
  "config": {
    "namespace": { "source": "settings", "setting_name": "SERVICEBUS_NAMESPACE" },
    "entity": {
      "type": "subscription",
      "topic_name": { "source": "inline", "value": "events" },
      "subscription_name": { "source": "inline", "value": "health-probe" }
    }
  }
}`}
            />
          </section>

          <section>
            <h4 className="font-semibold mb-2">Validation & Tips</h4>
            <ul className="list-disc ml-5 space-y-1">
              <li>Use the <strong>Validate</strong> button in the editor toolbar to check your JSON against the server schema before saving.</li>
              <li>Monaco shows red squiggles for schema errors; hover to see details.</li>
              <li>Prefer <strong>Key Vault</strong> or <strong>app settings</strong> for secrets—avoid putting secrets in <code>inline</code>.</li>
              <li><strong>ETags</strong> protect against concurrent edits; if you see a conflict, reload and try again.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Tiny presentational helpers -------------------- */

function CodeCard({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        {title}
      </div>
      <pre className="p-3 text-[11.5px] leading-5 whitespace-pre-wrap break-words bg-white dark:bg-gray-900">
        {children}
      </pre>
    </div>
  );
}

function ServiceBlock({
  name,
  required,
  optional,
  example,
}: {
  name: string;
  required: string[];
  optional?: string[];
  example: string;
}) {
  return (
    <div className="mb-5">
      <div className="font-medium mb-1">{name}</div>
      <div className="text-xs text-gray-700 dark:text-gray-300">
        <span className="font-semibold">Required:</span> {required.join(", ")}
        {optional?.length ? (
          <>
            {" "}| <span className="font-semibold">Optional:</span> {optional.join(", ")}
          </>
        ) : null}
      </div>
      <div className="mt-2">
        <CodeCard title={`${name} example`}>{example}</CodeCard>
      </div>
    </div>
  );
}

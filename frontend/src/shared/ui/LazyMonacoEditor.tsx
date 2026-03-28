import React, { Suspense } from "react";

import type { MonacoEditorProps } from "react-monaco-editor";

const MonacoEditor = React.lazy(() => import("react-monaco-editor"));

export default function LazyMonacoEditor(props: MonacoEditorProps) {
  return (
    <Suspense
      fallback={<div className="h-full w-full animate-pulse rounded bg-[var(--surface-panel-muted)]" />}
    >
      <MonacoEditor {...props} />
    </Suspense>
  );
}

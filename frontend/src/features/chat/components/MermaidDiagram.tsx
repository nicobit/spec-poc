"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  sx?: React.CSSProperties;
}

function normalizeMermaidChart(input: string) {
  let normalized = input.replace(/\r\n/g, "\n").replace(/\\n/g, "\n").trim();

  // AI-generated diagrams often collapse `subgraph`, node, and `end` tokens onto one line.
  normalized = normalized.replace(
    /^(\s*subgraph\b[^\n]*?)\s+([A-Za-z][\w-]*\s*(?:\[[^\]]*\]|\([^\)]*\)|\{[^}]*\}|>"[^"]*"))/gm,
    "$1\n$2",
  );
  normalized = normalized.replace(/(\[[^\]]*\]|\([^\)]*\)|\{[^}]*\}|>"[^"]*")\s+(end)\b/gm, "$1\n$2");

  return normalized;
}

const MermaidDiagram = ({ chart, sx }: MermaidDiagramProps) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current || !chart) return;

    const diagramId = `mermaid-${Date.now()}`;

    mermaid.initialize({
      startOnLoad: false,
      htmlLabels: true,
      theme: "base",
      suppressErrorRendering: true,
      securityLevel: "loose",
    });

    const formattedChart = normalizeMermaidChart(chart);

    const tryRender = async (source: string) => {
      await mermaid.parse(source);
      const { svg } = await mermaid.render(diagramId, source);
      if (chartRef.current) {
        chartRef.current.innerHTML = svg;

        const svgElement = chartRef.current.querySelector("svg");
        if (svgElement && sx) {
          Object.assign(svgElement.style, sx);
        }
      }
      setError(null);
    };

    void tryRender(formattedChart).catch(async () => {
      try {
        // Retry once with explicit line breaks around common flowchart delimiters.
        const retryChart = formattedChart
          .replace(/\s+(subgraph\b)/g, "\n$1")
          .replace(/\s+(end)\b/g, "\n$1");
        await tryRender(retryChart);
      } catch {
        setError("Invalid Mermaid syntax.");
        if (chartRef.current) chartRef.current.innerHTML = "";
      }
    });
  }, [chart, sx]);

  return (
    <>
      <section ref={chartRef} style={sx} />
      {error && <label style={{ color: "red" }}>{error}</label>}
    </>
  );
};

export default MermaidDiagram;

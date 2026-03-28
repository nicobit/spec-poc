"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  sx?: React.CSSProperties;
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

    const formattedChart = chart.replace(/\\n/g, "\n");

    try {
      mermaid.parse(formattedChart);
      mermaid
        .render(diagramId, formattedChart)
        .then(({ svg }) => {
          if (chartRef.current) {
            chartRef.current.innerHTML = svg;

            const svgElement = chartRef.current.querySelector("svg");
            if (svgElement && sx) {
              Object.assign(svgElement.style, sx);
            }
          }
          setError(null);
        })
        .catch((renderError) => {
          console.error("Render error:", renderError);
          setError("Failed to render diagram.");
          if (chartRef.current) chartRef.current.innerHTML = "";
        });
    } catch (parseError) {
      console.error("Parse error:", parseError);
      setError("Invalid Mermaid syntax.");
      if (chartRef.current) chartRef.current.innerHTML = "";
    }
  }, [chart, sx]);

  return (
    <>
      <section ref={chartRef} style={sx} />
      {error && <label style={{ color: "red" }}>{error}</label>}
    </>
  );
};

export default MermaidDiagram;

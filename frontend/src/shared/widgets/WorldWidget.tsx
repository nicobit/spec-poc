import React, { useRef, useState, useLayoutEffect } from 'react';
import WorldMap from 'react-svg-worldmap';
import '../../styles/worldmap.css'; 
import { Globe } from 'lucide-react';

export const icon = <Globe className="h-6 w-6 text-[var(--accent-primary)]" />;

const COUNTRIES = [
  { iso: 'CH', name: 'Switzerland' },
  { iso: 'GB', name: 'United Kingdom' },
  { iso: 'FR', name: 'France' },
  { iso: 'IT', name: 'Italy' },
  { iso: 'JP', name: 'Japan' },
  { iso: 'IN', name: 'India' },
  { iso: 'SE', name: 'Sweden' },
  { iso: 'AT', name: 'Austria' },
  { iso: 'GR', name: 'Greece' },
];

const data = COUNTRIES.map((c) => ({ country: c.iso, value: 1 }));

const stylingFunction = ({ countryValue, color }: any) => ({
  fill: countryValue != null ? color : 'color-mix(in srgb, var(--text-muted) 20%, transparent)',
  stroke: 'color-mix(in srgb, var(--surface-panel) 86%, white)',
  strokeWidth: 0.5,
  cursor: countryValue != null ? 'pointer' : 'default',
});

export default function WorldWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Update width on mount & resize
  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    update();
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 w-full h-full">
      {width > 0 && (
        <WorldMap
          color="var(--accent-primary)"
          size={width}
          data={data}
          backgroundColor="transparent"
          styleFunction={stylingFunction}
        />
      )}
    </div>
  );
}

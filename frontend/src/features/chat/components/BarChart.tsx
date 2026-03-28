import { useContext, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Loader2 } from 'lucide-react';

import { QueryContext } from '../contexts/QueryContext';

interface DataEntry {
  [key: string]: any;
}

export default function BarChart() {
  const queryContext = useContext(QueryContext);
  const chartRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        setWidth(chartRef.current.clientWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    if (!chartRef.current || !queryContext) {
      return;
    }

    const { queries, selectedIndex } = queryContext;
    const currentEntry =
      selectedIndex !== null && selectedIndex < queries.length ? queries[selectedIndex] : null;
    const data: DataEntry[] | null =
      currentEntry && currentEntry.result && Array.isArray(currentEntry.result)
        ? currentEntry.result
        : null;

    if (!data || data.length === 0) {
      return;
    }

    const sample = data[0];
    const keys = Object.keys(sample);
    if (keys.length < 2) {
      return;
    }

    const xField = keys[0];
    const yField = keys[1];
    const chartData = data.filter((entry) => typeof entry[yField] === 'number');

    const height = 400;
    const margin = { top: 20, right: 20, bottom: 100, left: 40 };

    const xScale = d3
      .scaleBand<string>()
      .domain(chartData.map((entry) => entry[xField]))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yMax = d3.max(chartData, (entry) => entry[yField]) as number;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .selectAll('rect')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('x', (entry) => xScale(entry[xField])!)
      .attr('y', (entry) => yScale(entry[yField])!)
      .attr('width', xScale.bandwidth())
      .attr('height', (entry) => height - margin.bottom - yScale(entry[yField])!)
      .attr('class', 'fill-indigo-600');

    svg
      .selectAll('text.label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'label text-xs text-gray-700')
      .attr('x', (entry) => xScale(entry[xField])! + xScale.bandwidth() / 2)
      .attr('y', height - margin.bottom + 40)
      .attr('text-anchor', 'end')
      .attr(
        'transform',
        (entry) =>
          `rotate(-45, ${xScale(entry[xField])! + xScale.bandwidth() / 2}, ${height - margin.bottom + 40})`,
      )
      .text((entry) => entry[xField]);

    const yAxis = d3.axisLeft(yScale).ticks(5);
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(yAxis);
  }, [queryContext, width]);

  if (!queryContext) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative mt-4 h-96 max-h-[60vh] w-full">
      <h2 className="mb-2 text-lg font-semibold text-gray-800">Chart</h2>
      <svg ref={chartRef} width="100%" height="100%" />
    </div>
  );
}

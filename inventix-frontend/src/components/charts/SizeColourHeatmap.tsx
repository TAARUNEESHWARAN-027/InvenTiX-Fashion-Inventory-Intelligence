import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface HeatmapDatum {
  style_name: string;
  size: string;
  colour: string;
  sell_through_rate: number;
  units_remaining: number;
}

interface Props {
  data: HeatmapDatum[];
}

interface Tooltip {
  x: number;
  y: number;
  datum: HeatmapDatum;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ── Heatmap Component ─────────────────────────────────────────────────────────
export const SizeColourHeatmap: React.FC<Props> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [selectedColour, setSelectedColour] = useState('All');

  // All unique colours in the dataset
  const colours = useMemo(() => ['All', ...Array.from(new Set(data.map(d => d.colour))).sort()], [data]);

  // Filter data by selected colour
  const filteredData = useMemo(
    () => selectedColour === 'All' ? data : data.filter(d => d.colour === selectedColour),
    [data, selectedColour]
  );

  // Determine unique axes
  const styles = useMemo(() => Array.from(new Set(filteredData.map(d => d.style_name))), [filteredData]);
  const sizes  = useMemo(() => {
    const found = Array.from(new Set(filteredData.map(d => d.size)));
    return SIZE_ORDER.filter(s => found.includes(s));
  }, [filteredData]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredData.length === 0) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width || 600;

    // ── Layout constants ──────────────────────────────────────────────────────
    const MARGIN = { top: 16, right: 20, bottom: 60, left: 160 };
    const cellHeight = 38;
    const height = MARGIN.top + styles.length * cellHeight + MARGIN.bottom;
    const innerW = containerWidth - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    // ── Scales ────────────────────────────────────────────────────────────────
    const xScale = d3.scaleBand().domain(sizes).range([0, innerW]).padding(0.08);
    const yScale = d3.scaleBand().domain(styles).range([0, innerH]).padding(0.08);

    // Color scale: cold navy → electric cyan (brand palette, no green)
    const colorScale = d3.scaleSequential(d3.interpolateRgb('#0D1B2A', '#00C2FF')).domain([0, 1]);

    // ── SVG setup ─────────────────────────────────────────────────────────────
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', containerWidth).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ── Cells ─────────────────────────────────────────────────────────────────
    filteredData.forEach(d => {
      const cx = xScale(d.size);
      const cy = yScale(d.style_name);
      if (cx === undefined || cy === undefined) return;

      const cellW = xScale.bandwidth();
      const cellH = yScale.bandwidth();
      const isDead = d.sell_through_rate < 0.2;

      // Cell rect
      g.append('rect')
        .attr('x', cx).attr('y', cy)
        .attr('width', cellW).attr('height', cellH)
        .attr('rx', 5).attr('ry', 5)
        .attr('fill', colorScale(d.sell_through_rate))
        .attr('stroke', isDead ? '#FF4757' : '#0D1B2A')
        .attr('stroke-width', isDead ? 2 : 0.5)
        .attr('class', isDead ? 'dead-cell' : '')
        .attr('cursor', 'pointer')
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).transition().duration(100).attr('opacity', 0.8);
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, datum: d });
        })
        .on('mousemove', function (event: MouseEvent) {
          const rect = containerRef.current!.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, datum: d });
        })
        .on('mouseleave', function () {
          d3.select(this).transition().duration(100).attr('opacity', 1);
          setTooltip(null);
        });

      // Rate label inside cell
      const label = `${(d.sell_through_rate * 100).toFixed(0)}%`;
      const textColor = d.sell_through_rate > 0.45 ? '#0D1B2A' : '#9CA3AF';
      g.append('text')
        .attr('x', cx + cellW / 2).attr('y', cy + cellH / 2)
        .attr('dominant-baseline', 'middle').attr('text-anchor', 'middle')
        .attr('fill', textColor).attr('font-size', '11px').attr('font-weight', '700')
        .attr('pointer-events', 'none')
        .text(label);
    });

    // ── X Axis ────────────────────────────────────────────────────────────────
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text')
        .attr('fill', '#9CA3AF').attr('font-size', '11px').attr('font-weight', '600')
        .attr('dy', '1.2em'));

    // ── Y Axis ────────────────────────────────────────────────────────────────
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text')
        .attr('fill', '#D1D5DB').attr('font-size', '11px')
        .attr('dx', '-0.4em')
        .each(function () {
          const el = d3.select(this);
          const txt = el.text();
          if (txt.length > 18) el.text(txt.slice(0, 18) + '…');
        }));

    // ── Legend ────────────────────────────────────────────────────────────────
    const legendW = Math.min(280, innerW * 0.6);
    const legendX = (innerW - legendW) / 2;
    const legendY = innerH + 36;
    const defs = svg.append('defs');
    const gradId = 'heatmap-gradient';
    const grad = defs.append('linearGradient').attr('id', gradId);
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#0D1B2A');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#00C2FF');

    const lg = g.append('g').attr('transform', `translate(${legendX},${legendY})`);
    lg.append('rect').attr('width', legendW).attr('height', 10).attr('rx', 5)
      .attr('fill', `url(#${gradId})`).attr('stroke', '#243357').attr('stroke-width', 0.5);
    lg.append('text').attr('x', 0).attr('y', 24).attr('fill', '#6B7280').attr('font-size', '9px').text('0% Sell-Through');
    lg.append('text').attr('x', legendW).attr('y', 24).attr('text-anchor', 'end').attr('fill', '#6B7280').attr('font-size', '9px').text('100%');
    lg.append('text').attr('x', legendW / 2).attr('y', -6).attr('text-anchor', 'middle')
      .attr('fill', '#9CA3AF').attr('font-size', '10px').attr('font-weight', '600').text('Sell-Through Rate');

  }, [filteredData, styles, sizes]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        No variant data available for heatmap
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Colour filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Colour</span>
        <div className="flex gap-2 flex-wrap">
          {colours.map(c => (
            <button
              key={c}
              onClick={() => setSelectedColour(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedColour === c
                  ? 'bg-electric text-navy-900 border-electric'
                  : 'border-navy-700 text-gray-400 hover:text-white hover:border-navy-500'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-600 flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded border-2 border-danger animate-pulse" />
          Dead size (sell-through &lt; 20%)
        </span>
      </div>

      {/* SVG container */}
      <div ref={containerRef} className="relative w-full bg-navy-900 rounded-2xl border border-navy-700 overflow-hidden p-2">
        <svg ref={svgRef} className="block w-full" />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 shadow-2xl text-xs space-y-1.5"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10, maxWidth: 220 }}
          >
            <p className="font-bold text-white text-sm">{tooltip.datum.style_name}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
              <span className="text-gray-500">Size</span>
              <span className="text-white font-semibold font-mono">{tooltip.datum.size}</span>
              <span className="text-gray-500">Colour</span>
              <span className="text-white font-semibold">{tooltip.datum.colour}</span>
              <span className="text-gray-500">Sell-Through</span>
              <span className={`font-bold font-mono ${tooltip.datum.sell_through_rate < 0.2 ? 'text-danger' : tooltip.datum.sell_through_rate > 0.6 ? 'text-electric' : 'text-amber'}`}>
                {(tooltip.datum.sell_through_rate * 100).toFixed(1)}%
              </span>
              <span className="text-gray-500">Units Left</span>
              <span className="text-white font-semibold">{tooltip.datum.units_remaining}</span>
            </div>
            {tooltip.datum.sell_through_rate < 0.2 && (
              <div className="mt-1.5 px-2 py-1 bg-danger/10 border border-danger/20 text-danger rounded-lg text-[10px] font-bold tracking-wide">
                ⚠ DEAD SIZE — No Action Taken
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

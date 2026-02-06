'use client';

import { LineSeries, createChart, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { useEffect, useMemo, useRef } from 'react';

export const RsiChart = ({ times, rsi }: { times: string[]; rsi: Array<number | null> }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const data = useMemo(() => {
    const out: Array<{ time: Time; value: number }> = [];
    for (let i = 0; i < times.length; i++) {
      const v = rsi[i];
      if (v === null || v === undefined) continue;
      out.push({ time: (Math.floor(new Date(times[i]!).getTime() / 1000) as unknown as Time), value: v });
    }
    return out;
  }, [times, rsi]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      height: 160,
      layout: { background: { color: '#ffffff' }, textColor: '#111827' },
      grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 2 });
    seriesRef.current = series;
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
      chart.timeScale().fitContent();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(data as any);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div className="w-full rounded-lg border" ref={containerRef} />;
};


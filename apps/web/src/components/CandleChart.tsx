'use client';

import {
  CandlestickSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import { useEffect, useMemo, useRef } from 'react';

type Candle = { t: string; o: number; h: number; l: number; c: number; v: number };

export const CandleChart = ({
  candles,
  overlays,
}: {
  candles: Candle[];
  overlays?: {
    sma20?: Array<number | null>;
    ema20?: Array<number | null>;
    vwap?: Array<number | null>;
  };
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const smaRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapRef = useRef<ISeriesApi<'Line'> | null>(null);

  const data = useMemo(
    () =>
      candles.map((c) => ({
        time: (Math.floor(new Date(c.t).getTime() / 1000) as unknown as Time),
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      })),
    [candles],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      height: 420,
      layout: { background: { color: '#ffffff' }, textColor: '#111827' },
      grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries);
    const sma = chart.addSeries(LineSeries, { color: '#2563eb', lineWidth: 2 });
    const ema = chart.addSeries(LineSeries, { color: '#16a34a', lineWidth: 2 });
    const vw = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2 });
    chartRef.current = chart;
    seriesRef.current = series;
    smaRef.current = sma;
    emaRef.current = ema;
    vwapRef.current = vw;

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
      smaRef.current = null;
      emaRef.current = null;
      vwapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(data);
    const mkLine = (arr?: Array<number | null>) =>
      arr
        ? arr
            .map((v, i) =>
              v === null
                ? null
                : {
                    time: data[i]?.time,
                    value: v,
                  },
            )
            .filter(Boolean)
        : [];
    smaRef.current?.setData(mkLine(overlays?.sma20) as any);
    emaRef.current?.setData(mkLine(overlays?.ema20) as any);
    vwapRef.current?.setData(mkLine(overlays?.vwap) as any);
    chartRef.current?.timeScale().fitContent();
  }, [data, overlays?.sma20, overlays?.ema20, overlays?.vwap]);

  return <div className="w-full rounded-lg border" ref={containerRef} />;
};

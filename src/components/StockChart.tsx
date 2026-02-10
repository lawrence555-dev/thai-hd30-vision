"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, UTCTimestamp } from 'lightweight-charts';
import React from 'react';

interface ChartPoint {
    time: number; // Unix timestamp in seconds
    price: number;
}

interface StockChartProps {
    data: ChartPoint[];
    color?: string;
}

export const StockChart: React.FC<StockChartProps> = ({ data, color = '#22c55e' }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            grid: {
                vertLines: { visible: false },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000); // lightweight-charts uses seconds
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                },
            },
            handleScale: false, // User requested fixed view
            handleScroll: false,
        });

        // Add Area Series
        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: lineColor,
            topColor: topColor,
            bottomColor: bottomColor,
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            crosshairMarkerVisible: enableCrosshair,
        });

        if (data.length > 0) {
            // Sort data by time safely
            const sortedData = [...data].sort((a, b) => new Date(`2000/01/01 ${a.time}`).getTime() - new Date(`2000/01/01 ${b.time}`).getTime());

            const today = new Date();
            const chartData = sortedData.map(d => {
                const [h, m] = d.time.split(':').map(Number);
                const date = new Date(today);
                date.setHours(h, m, 0, 0);
                return {
                    time: (date.getTime() / 1000) as Time,
                    value: d.value
                };
            }).filter((item, index, self) =>
                index === self.findIndex((t) => t.time === item.time)
            ).sort((a, b) => (a.time as number) - (b.time as number));

            newSeries.setData(chartData);
            chart.timeScale().fitContent();
        }

        chartRef.current = chart;

        // ResizeObserver for robust sizing
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !entries[0].contentRect) return;
            const { width } = entries[0].contentRect;
            if (width > 0) {
                chart.applyOptions({ width });
            }
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, isUp, height, lineColor, topColor, bottomColor, enableGrid, enableCrosshair]);

    return <div ref={chartContainerRef} className="w-full relative uppercase" style={{ height }} />;
}

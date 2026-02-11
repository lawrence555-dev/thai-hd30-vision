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

export const StockChart: React.FC<StockChartProps> = ({
    data,
    color = '#22c55e',
    height = 300,
    enableGrid = false,
    enableCrosshair = false,
    topColor,
    bottomColor
}) => {
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

        // Determine line color based on trend (First vs Last)
        let lineColor = '#22c55e'; // Default green
        if (data.length >= 2) {
            // Assuming data[0].value and data[data.length - 1].value are the prices
            const first = data[0].value;
            const last = data[data.length - 1].value;
            lineColor = last >= first ? '#22c55e' : '#ef4444'; // Rise (Green) / Fall (Red)
        }

        const newSeries = chart.addAreaSeries({
            lineColor: lineColor,
            topColor: `${lineColor}20`, // low opacity
            bottomColor: 'rgba(0, 0, 0, 0)', // transparent
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            crosshairMarkerVisible: false, // Fixed from 'enableCrosshair'
        });

        if (data.length > 0) {
            // Sort data by time safely
            const sortedData = [...data].sort((a, b) => {
                // Assuming time is in "HH:MM" format for sorting
                const [h1, m1] = a.time.split(':').map(Number);
                const [h2, m2] = b.time.split(':').map(Number);
                return (h1 * 60 + m1) - (h2 * 60 + m2);
            });

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
    }, [data, height, lineColor, topColor, bottomColor, enableGrid, enableCrosshair]);

    return <div ref={chartContainerRef} className="w-full relative uppercase" style={{ height }} />;
}

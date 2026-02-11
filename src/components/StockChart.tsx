"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, UTCTimestamp, AreaSeries } from 'lightweight-charts';
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
            const first = data[0].price;
            const last = data[data.length - 1].price;
            lineColor = last >= first ? '#22c55e' : '#ef4444';
        }

        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: lineColor,
            topColor: `${lineColor}20`, // low opacity
            bottomColor: 'rgba(0, 0, 0, 0)', // transparent
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            crosshairMarkerVisible: false,
        });

        if (data.length > 0) {
            // Sort data by time safely (data is already unix timestamp numbers)
            const sortedData = [...data].sort((a, b) => a.time - b.time);

            // Ensure unique times
            const uniqueData = [];
            const seenTimes = new Set();
            for (const item of sortedData) {
                if (!seenTimes.has(item.time)) {
                    seenTimes.add(item.time);
                    uniqueData.push({
                        time: item.time as any, // Cast to any to satisfy v3 interface if needed
                        value: item.price
                    });
                }
            }
            newSeries.setData(uniqueData);
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
    }, [data, height, enableGrid, enableCrosshair]);

    return <div ref={chartContainerRef} className="w-full relative uppercase" style={{ height }} />;
}

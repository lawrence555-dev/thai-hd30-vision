"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, UTCTimestamp, AreaSeries } from 'lightweight-charts';
import React from 'react';

interface ChartPoint {
    time: number; // Unix timestamp in seconds
    price: number | null | undefined; // Allow null/undefined for gaps
}

interface StockChartProps {
    data: ChartPoint[];
    color?: string;
    height?: number;
    enableGrid?: boolean;
    enableCrosshair?: boolean;
    topColor?: string;
    bottomColor?: string;
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

        const createChartInstance = () => {
            if (!chartContainerRef.current) return;

            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: '#94a3b8',
                },
                width: chartContainerRef.current.clientWidth || 300, // Initial width fallback
                height: height, // Use prop height for initial render
                autoSize: true,
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
                        return date.toLocaleTimeString('en-GB', {
                            timeZone: 'Asia/Bangkok',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                    },
                },
                handleScale: false, // User requested fixed view
                handleScroll: false,
            });

            // Determine line color based on trend (First vs Last VALID price)
            let lineColor = '#22c55e'; // Default green

            // Find first valid price
            const firstPoint = data.find(p => p.price !== null && p.price !== undefined && !isNaN(p.price));
            // Find last valid price
            const lastPoint = [...data].reverse().find(p => p.price !== null && p.price !== undefined && !isNaN(p.price));

            if (firstPoint && lastPoint && firstPoint.price != null && lastPoint.price != null) {
                lineColor = lastPoint.price >= firstPoint.price ? '#22c55e' : '#ef4444';
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
                    // Validate price is a finite number
                    if (
                        !seenTimes.has(item.time) &&
                        item.price !== null &&
                        item.price !== undefined &&
                        !isNaN(item.price) &&
                        isFinite(item.price)
                    ) {
                        seenTimes.add(item.time);
                        uniqueData.push({
                            time: item.time as any,
                            value: item.price
                        });
                    }
                }
                newSeries.setData(uniqueData);
                chart.timeScale().fitContent();
            }

            chartRef.current = chart;
        };

        // Initialize with default dimensions (autoSize will handle the rest)
        if (chartContainerRef.current) {
            createChartInstance();
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [data, color, height]); // Re-create if data changes, but handle resize internally, enableGrid, enableCrosshair]);

    return <div ref={chartContainerRef} className="w-full relative uppercase" style={{ height }} />;
}

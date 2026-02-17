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
    markers?: any[]; // SeriesMarker<Time>[]
    color?: string;
    height?: number;
    enableGrid?: boolean;
    enableCrosshair?: boolean;
    topColor?: string;
    bottomColor?: string;
}

export const StockChart: React.FC<StockChartProps> = ({
    data,
    markers,
    color = '#ff4d4d',
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
                localization: {
                    timeFormatter: (time: number) => {
                        const date = new Date(time * 1000);
                        return date.toLocaleTimeString('en-GB', {
                            timeZone: 'Asia/Bangkok',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
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
            let lineColor = '#ff4d4d'; // Default Red (Up)

            // Find first valid price
            const firstPoint = data.find(p => p.price !== null && p.price !== undefined && !isNaN(p.price));
            // Find last valid price
            const lastPoint = [...data].reverse().find(p => p.price !== null && p.price !== undefined && !isNaN(p.price));

            if (firstPoint && lastPoint && firstPoint.price != null && lastPoint.price != null) {
                // Asian Style: Up is Red (#ff4d4d), Down is Green (#22c55e)
                lineColor = lastPoint.price >= firstPoint.price ? '#ff4d4d' : '#22c55e';
            }

            const newSeries = chart.addSeries(AreaSeries, {
                lineColor: lineColor,
                topColor: `${lineColor}20`, // low opacity
                bottomColor: 'rgba(0, 0, 0, 0)', // transparent
                lineWidth: 2,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
                crosshairMarkerVisible: false,
            });

            if (markers && markers.length > 0) {
                if (typeof newSeries.setMarkers === 'function') {
                    newSeries.setMarkers(markers);
                } else {
                    console.warn("setMarkers is not a function on newSeries", newSeries);
                }
            }

            if (data.length > 0) {
                // Sort data by time safely (data is already unix timestamp numbers)
                const sortedData = [...data].sort((a, b) => a.time - b.time);

                const uniqueData = [];
                const seenTimes = new Set();
                for (const item of sortedData) {
                    // Prevent duplicate times
                    if (seenTimes.has(item.time)) continue;
                    seenTimes.add(item.time);

                    // Check for valid price
                    if (item.price !== null && item.price !== undefined && !isNaN(item.price) && isFinite(item.price)) {
                        uniqueData.push({
                            time: item.time as any,
                            value: item.price
                        });
                    } else {
                        // Handle Whitespace (Gap) - Push object with ONLY time
                        uniqueData.push({
                            time: item.time as any
                            // No value property creates a whitespace/gap
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
    }, [data, markers, color, height]); // Re-create if data checks/markers change

    return <div ref={chartContainerRef} className="w-full relative uppercase" style={{ height }} />;
}

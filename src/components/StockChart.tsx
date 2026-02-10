"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, Time, AreaSeries } from "lightweight-charts";

interface StockChartProps {
    data: { time: string; value: number }[];
    isUp: boolean;
    height?: number;
    enableGrid?: boolean;
    enableCrosshair?: boolean;
}

export default function StockChart({
    data,
    isUp,
    height = 300,
    enableGrid = true,
    enableCrosshair = true,

}: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    // Design System Colors
    const upColor = "#00ff88"; // Rise Green
    const downColor = "#ff4d4d"; // Fall Red
    const lineColor = isUp ? upColor : downColor;
    const topColor = isUp ? "rgba(0, 255, 136, 0.4)" : "rgba(255, 77, 77, 0.4)";
    const bottomColor = "rgba(0, 0, 0, 0)"; // Fade to transparent

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#a3a3a3", // neutral-400
            },
            width: chartContainerRef.current.clientWidth || 400, // Fallback width
            height: height,
            grid: {
                vertLines: { visible: enableGrid, color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { visible: enableGrid, color: "rgba(255, 255, 255, 0.05)" },
            },
            // ... (rest of config)
            timeScale: {
                visible: true,
                timeVisible: true,
                secondsVisible: false,
                borderColor: "rgba(255, 255, 255, 0.1)",
            },
            rightPriceScale: {
                visible: true,
                borderColor: "rgba(255, 255, 255, 0.1)",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            crosshair: {
                vertLine: {
                    visible: enableCrosshair,
                    color: "#ffffff",
                    width: 1,
                    style: 3,
                    labelBackgroundColor: "#262626",
                },
                horzLine: {
                    visible: enableCrosshair,
                    color: "#ffffff",
                    width: 1,
                    style: 3,
                    labelBackgroundColor: "#262626",
                },
            },
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

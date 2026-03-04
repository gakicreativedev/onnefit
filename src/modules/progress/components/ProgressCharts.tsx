import { useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { BodyMeasurement, MeasurementField } from "../types";
import { MEASUREMENT_LABELS, MEASUREMENT_ICONS } from "../types";

const CHART_METRICS: MeasurementField[] = [
    "weight_kg", "body_fat_pct", "waist_cm", "hip_cm", "chest_cm",
    "arm_left_cm", "arm_right_cm", "thigh_left_cm", "thigh_right_cm", "neck_cm",
];

const COLORS = [
    "hsl(var(--primary))",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6366f1",
];

interface ProgressChartsProps {
    measurements: BodyMeasurement[];
}

export function ProgressCharts({ measurements }: ProgressChartsProps) {
    const [activeMetric, setActiveMetric] = useState<MeasurementField>("weight_kg");

    // Filter metrics that have at least 1 data point
    const availableMetrics = CHART_METRICS.filter((metric) =>
        measurements.some((m) => m[metric] !== null && m[metric] !== undefined)
    );

    const chartData = measurements
        .filter((m) => m[activeMetric] !== null && m[activeMetric] !== undefined)
        .map((m) => ({
            date: new Date(m.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
            rawDate: m.date,
            value: m[activeMetric] as number,
        }));

    if (availableMetrics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <span className="text-4xl mb-3">📈</span>
                <p className="text-sm">Adicione medidas para ver os gráficos</p>
            </div>
        );
    }

    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 5;

    return (
        <div className="space-y-4">
            {/* Metric selector pills */}
            <div className="flex flex-wrap gap-1.5">
                {availableMetrics.map((metric, i) => (
                    <button
                        key={metric}
                        onClick={() => setActiveMetric(metric)}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeMetric === metric
                                ? "bg-primary text-primary-foreground glow-primary-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {MEASUREMENT_ICONS[metric]} {MEASUREMENT_LABELS[metric]}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[Math.floor(min - padding), Math.ceil(max + padding)]}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "12px",
                                fontSize: "12px",
                            }}
                            formatter={(value: number) => [
                                `${value} ${MEASUREMENT_LABELS[activeMetric].split("(")[1]?.replace(")", "") || ""}`,
                                MEASUREMENT_LABELS[activeMetric].split("(")[0],
                            ]}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={COLORS[availableMetrics.indexOf(activeMetric) % COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "hsl(var(--card))", strokeWidth: 2 }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[availableMetrics.indexOf(activeMetric) % COLORS.length] }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stats row */}
            {chartData.length >= 2 && (
                <div className="flex gap-3">
                    {(() => {
                        const first = chartData[0].value;
                        const last = chartData[chartData.length - 1].value;
                        const diff = last - first;
                        const pct = ((diff / first) * 100).toFixed(1);
                        const isPositive = diff > 0;
                        return (
                            <>
                                <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                                    <p className="text-[10px] text-muted-foreground font-semibold">Início</p>
                                    <p className="text-lg font-black">{first}</p>
                                </div>
                                <div className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                                    <p className="text-[10px] text-muted-foreground font-semibold">Atual</p>
                                    <p className="text-lg font-black">{last}</p>
                                </div>
                                <div className={`flex-1 rounded-xl p-3 text-center ${activeMetric === "weight_kg" || activeMetric === "body_fat_pct" || activeMetric === "waist_cm"
                                        ? isPositive ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"
                                        : isPositive ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                                    }`}>
                                    <p className="text-[10px] font-semibold opacity-80">Variação</p>
                                    <p className="text-lg font-black">{isPositive ? "+" : ""}{diff.toFixed(1)}</p>
                                    <p className="text-[10px] font-bold">{isPositive ? "+" : ""}{pct}%</p>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

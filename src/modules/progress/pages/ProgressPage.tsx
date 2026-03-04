import { useState, lazy, Suspense } from "react";
import { useBodyMeasurements } from "../hooks/useBodyMeasurements";
import { useProgressPhotos } from "../hooks/useProgressPhotos";
import { MeasurementForm } from "../components/MeasurementForm";
import { ProgressCharts } from "../components/ProgressCharts";
import { PhotoGallery } from "../components/PhotoGallery";
import { MEASUREMENT_LABELS, MEASUREMENT_ICONS, type MeasurementField } from "../types";
import { motion, AnimatePresence } from "framer-motion";

const HistoryPage = lazy(() => import("@/modules/history/pages/HistoryPage"));

type Tab = "overview" | "charts" | "photos" | "history";

function DeltaBadge({ label, current, previous, invert }: {
    label: string;
    current: number | null;
    previous: number | null;
    invert?: boolean;
}) {
    if (current === null) return null;
    const diff = previous !== null ? current - previous : null;
    const isGood = diff !== null ? (invert ? diff < 0 : diff > 0) : null;

    return (
        <div className="rounded-2xl bg-card border border-border/40 p-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className="text-xl font-black">{current}</span>
            {diff !== null && (
                <span className={`text-xs font-bold ${isGood ? "text-green-500" : "text-destructive"}`}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                </span>
            )}
        </div>
    );
}

export default function ProgressPage() {
    const { measurements, loading, add, remove, latest, previous } = useBodyMeasurements();
    const { photos, loading: photosLoading, uploading, upload, remove: removePhoto } = useProgressPhotos();
    const [tab, setTab] = useState<Tab>("overview");
    const [showForm, setShowForm] = useState(false);

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: "overview", label: "Medidas", icon: "📏" },
        { id: "charts", label: "Gráficos", icon: "📈" },
        { id: "photos", label: "Fotos", icon: "📷" },
        { id: "history", label: "Histórico", icon: "📅" },
    ];

    // Key measurement fields to show in overview
    const overviewFields: { field: MeasurementField; invert?: boolean }[] = [
        { field: "weight_kg", invert: true },
        { field: "body_fat_pct", invert: true },
        { field: "waist_cm", invert: true },
        { field: "chest_cm" },
        { field: "arm_left_cm" },
        { field: "arm_right_cm" },
        { field: "hip_cm", invert: true },
        { field: "thigh_left_cm" },
        { field: "thigh_right_cm" },
        { field: "neck_cm" },
    ];

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black">📊 Progresso Corporal</h1>
                <p className="text-sm text-muted-foreground mt-1">Acompanhe sua evolução com medidas e fotos</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/50 rounded-2xl p-1">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${tab === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {tab === t.id && (
                            <motion.div
                                layoutId="progress-tab"
                                className="absolute inset-0 rounded-xl bg-primary glow-primary-sm"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{t.icon}</span>
                        <span className="relative z-10 hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* ── Medidas Tab ── */}
                    {tab === "overview" && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="w-full rounded-2xl border-2 border-dashed border-primary/30 py-4 text-sm font-bold text-primary hover:border-primary/60 hover:bg-primary/5 transition-all"
                            >
                                {showForm ? "✕ Fechar formulário" : "+ Nova Medida"}
                            </button>

                            <AnimatePresence>
                                {showForm && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="glass-card rounded-2xl p-4">
                                            <MeasurementForm onSubmit={add} onCancel={() => setShowForm(false)} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            ) : latest ? (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        Última atualização: {new Date(latest.date).toLocaleDateString("pt-BR")}
                                        {latest.notes && <span className="ml-2 italic">— {latest.notes}</span>}
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {overviewFields.map(({ field, invert }) => (
                                            <DeltaBadge
                                                key={field}
                                                label={`${MEASUREMENT_ICONS[field]} ${MEASUREMENT_LABELS[field]}`}
                                                current={latest[field]}
                                                previous={previous?.[field] ?? null}
                                                invert={invert}
                                            />
                                        ))}
                                    </div>

                                    {/* History list */}
                                    {measurements.length > 1 && (
                                        <div className="space-y-2 mt-4">
                                            <h3 className="text-sm font-bold text-muted-foreground">Histórico</h3>
                                            {[...measurements].reverse().map((m) => (
                                                <div key={m.id} className="flex items-center justify-between rounded-xl bg-card border border-border/40 p-3">
                                                    <div>
                                                        <p className="text-sm font-bold">{new Date(m.date).toLocaleDateString("pt-BR")}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {m.weight_kg && `${m.weight_kg}kg`}
                                                            {m.body_fat_pct && ` · ${m.body_fat_pct}%`}
                                                            {m.waist_cm && ` · ${m.waist_cm}cm cintura`}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => remove(m.id)}
                                                        className="text-xs text-destructive hover:underline font-semibold"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <span className="text-5xl mb-4">📏</span>
                                    <p className="text-sm font-bold">Nenhuma medida ainda</p>
                                    <p className="text-xs mt-1">Registre suas medidas para acompanhar o progresso</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Gráficos Tab ── */}
                    {tab === "charts" && (
                        <div className="glass-card rounded-2xl p-4">
                            <ProgressCharts measurements={measurements} />
                        </div>
                    )}

                    {/* ── Fotos Tab ── */}
                    {tab === "photos" && (
                        <PhotoGallery
                            photos={photos}
                            uploading={uploading}
                            onUpload={upload}
                            onDelete={removePhoto}
                        />
                    )}

                    {/* ── Histórico Tab ── */}
                    {tab === "history" && (
                        <Suspense fallback={
                            <div className="flex items-center justify-center py-12">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        }>
                            <HistoryPage />
                        </Suspense>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

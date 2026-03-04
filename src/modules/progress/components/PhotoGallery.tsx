import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrashBinMinimalisticBold } from "solar-icon-set";
import { PHOTO_CATEGORIES, type ProgressPhoto } from "../types";

interface PhotoGalleryProps {
    photos: ProgressPhoto[];
    uploading: boolean;
    onUpload: (file: File, category: "front" | "side" | "back", date: string, notes?: string) => Promise<boolean>;
    onDelete: (photo: ProgressPhoto) => void;
}

export function PhotoGallery({ photos, uploading, onUpload, onDelete }: PhotoGalleryProps) {
    const [activeFilter, setActiveFilter] = useState<"all" | "front" | "side" | "back">("all");
    const [showUpload, setShowUpload] = useState(false);
    const [uploadCategory, setUploadCategory] = useState<"front" | "side" | "back">("front");
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split("T")[0]);
    const [uploadNotes, setUploadNotes] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<ProgressPhoto[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const selectedFile = useRef<File | null>(null);

    const filtered = activeFilter === "all"
        ? photos
        : photos.filter((p) => p.category === activeFilter);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        selectedFile.current = file;
        setPreviewUrl(URL.createObjectURL(file));
        setShowUpload(true);
    };

    const handleUpload = async () => {
        if (!selectedFile.current) return;
        const ok = await onUpload(selectedFile.current, uploadCategory, uploadDate, uploadNotes);
        if (ok) {
            setShowUpload(false);
            setPreviewUrl(null);
            selectedFile.current = null;
            setUploadNotes("");
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const toggleCompareSelect = (photo: ProgressPhoto) => {
        setSelectedPhotos((prev) => {
            if (prev.find((p) => p.id === photo.id)) return prev.filter((p) => p.id !== photo.id);
            if (prev.length >= 2) return [prev[1], photo];
            return [...prev, photo];
        });
    };

    return (
        <div className="space-y-4">
            {/* Compare mode */}
            {compareMode && selectedPhotos.length === 2 && (
                <div className="rounded-2xl bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold">📊 Comparação</h3>
                        <Button size="sm" variant="ghost" onClick={() => { setCompareMode(false); setSelectedPhotos([]); }}>
                            Fechar
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {selectedPhotos.map((p) => (
                            <div key={p.id} className="relative overflow-hidden rounded-xl">
                                <img src={p.photo_url} alt={p.category} className="w-full aspect-[3/4] object-cover" />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                    <p className="text-white text-xs font-bold">
                                        {new Date(p.date).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    className="rounded-xl glow-primary-sm"
                    onClick={() => fileRef.current?.click()}
                >
                    🖼️ Galeria
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => cameraRef.current?.click()}
                >
                    📷 Câmera
                </Button>
                <Button
                    size="sm"
                    variant={compareMode ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => { setCompareMode(!compareMode); setSelectedPhotos([]); }}
                    disabled={photos.length < 2}
                >
                    🔄 Comparar
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {/* Upload form */}
            {showUpload && previewUrl && (
                <div className="rounded-2xl glass-card p-4 space-y-3 animate-fade-in-up">
                    <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-contain rounded-xl bg-muted" />
                    <div className="grid grid-cols-3 gap-2">
                        {PHOTO_CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setUploadCategory(cat.value)}
                                className={`rounded-xl py-2 text-xs font-bold transition-all ${uploadCategory === cat.value
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                    <Input
                        type="date"
                        value={uploadDate}
                        onChange={(e) => setUploadDate(e.target.value)}
                        className="h-10 rounded-xl"
                    />
                    <Input
                        placeholder="Observações (opcional)"
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        className="h-10 rounded-xl"
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowUpload(false); setPreviewUrl(null); }}>
                            Cancelar
                        </Button>
                        <Button className="flex-1 rounded-xl glow-primary-sm" onClick={handleUpload} disabled={uploading}>
                            {uploading ? "Enviando..." : "Salvar"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Filter pills */}
            <div className="flex gap-1.5">
                {[{ value: "all" as const, label: "Todas" }, ...PHOTO_CATEGORIES].map((cat) => (
                    <button
                        key={cat.value}
                        onClick={() => setActiveFilter(cat.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeFilter === cat.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Gallery grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <span className="text-4xl mb-3">📷</span>
                    <p className="text-sm">Nenhuma foto ainda</p>
                    <p className="text-xs mt-1">Tire fotos regularmente para acompanhar sua evolução</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {filtered.map((photo) => {
                        const isSelected = compareMode && selectedPhotos.find((p) => p.id === photo.id);
                        return (
                            <div
                                key={photo.id}
                                className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all ${compareMode ? "hover:ring-2 hover:ring-primary" : ""
                                    } ${isSelected ? "ring-2 ring-primary" : ""}`}
                                onClick={() => compareMode && toggleCompareSelect(photo)}
                            >
                                <img
                                    src={photo.photo_url}
                                    alt={photo.category}
                                    className="w-full aspect-[3/4] object-cover"
                                    loading="lazy"
                                />
                                {/* Date overlay */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                    <p className="text-white text-[10px] font-bold">
                                        {new Date(photo.date).toLocaleDateString("pt-BR")}
                                    </p>
                                    <p className="text-white/70 text-[9px] capitalize">{photo.category === "front" ? "Frente" : photo.category === "side" ? "Lateral" : "Costas"}</p>
                                </div>
                                {/* Delete button */}
                                {!compareMode && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
                                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashBinMinimalisticBold size={14} color="currentColor" />
                                    </button>
                                )}
                                {/* Compare check */}
                                {compareMode && isSelected && (
                                    <div className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">
                                        {selectedPhotos.indexOf(photo) + 1}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

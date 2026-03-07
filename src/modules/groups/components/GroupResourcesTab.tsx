import { useState } from "react";
import { type GroupResource } from "../hooks/useGroups";
import { LinkRoundBold, AddCircleBold, TrashBinTrashBold, FileBold } from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GroupResourcesTabProps {
    resources: GroupResource[];
    isAdmin: boolean;
    onCreateResource: (res: Partial<GroupResource>) => Promise<void>;
    onDeleteResource: (id: string) => Promise<void>;
}

export default function GroupResourcesTab({ resources, isAdmin, onCreateResource, onDeleteResource }: GroupResourcesTabProps) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [description, setDescription] = useState("");

    const handleCreate = async () => {
        if (!title) return;
        await onCreateResource({
            title,
            url: url || null,
            description: description || null,
        });
        setOpen(false);
        setTitle("");
        setUrl("");
        setDescription("");
    };

    return (
        <div className="space-y-4">
            {isAdmin && (
                <Button variant="outline" className="w-full rounded-xl mb-2" onClick={() => setOpen(true)}>
                    <AddCircleBold size={16} color="currentColor" className="mr-2" />
                    Adicionar Material / Link
                </Button>
            )}

            {resources.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-card border border-border/50">
                    <span className="text-muted-foreground flex justify-center mb-3">
                        <FileBold size={48} color="currentColor" className="opacity-50" />
                    </span>
                    <p className="text-foreground font-medium">Nenhum material fixado</p>
                    <p className="text-xs text-muted-foreground mt-1">O admin pode adicionar links e dicas aqui.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {resources.map(res => (
                        <div key={res.id} className="relative bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                {res.url ? <LinkRoundBold size={20} /> : <FileBold size={20} />}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-sm text-foreground truncate pr-6">{res.title}</h4>
                                    {isAdmin && (
                                        <button onClick={() => onDeleteResource(res.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                            <TrashBinTrashBold size={16} />
                                        </button>
                                    )}
                                </div>
                                {res.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{res.description}</p>
                                )}
                                {res.url && (
                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs font-bold text-primary hover:underline truncate max-w-full">
                                        Acessar Link →
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Novo Material</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Título</label>
                            <Input placeholder="Ex: Planilha de Treino de Força" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Link (URL) - opcional</label>
                            <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Descrição - opcional</label>
                            <textarea
                                className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Detalhes sobre este material..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <Button className="w-full font-bold pt-2 mt-2" onClick={handleCreate}>Salvar Material</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

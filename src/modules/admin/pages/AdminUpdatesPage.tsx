import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useAppUpdates } from "../hooks/useAppUpdates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookBold, AddCircleBold, CloseCircleBold } from "solar-icon-set";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const categoryLabels: Record<string, string> = {
  update: "Atualização",
  feature: "Nova Funcionalidade",
  tip: "Dica",
  event: "Evento",
};

export default function AdminUpdatesPage() {
  const { user } = useAuth();
  const { updates, loading, addUpdate, deleteUpdate } = useAppUpdates();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "update" });

  const handleAdd = async () => {
    if (!form.title.trim() || !form.content.trim() || !user) return;
    const { error } = await addUpdate(form, user.id);
    if (error) {
      toast.error("Erro ao publicar");
    } else {
      toast.success("Atualização publicada!");
      setShowAdd(false);
      setForm({ title: "", content: "", category: "update" });
    }
  };

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Atualizações</h1>
          <p className="text-sm text-muted-foreground">{updates.length} publicação(ões)</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl gap-2">
          <AddCircleBold size={18} color="currentColor" />
          Nova Publicação
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
            <BookBold size={48} color="currentColor" />
            <p className="text-base font-semibold">Nenhuma atualização publicada</p>
          </div>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="flex items-start gap-3 rounded-[16px] bg-card p-4">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <BookBold size={20} color="currentColor" className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-foreground truncate">{update.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                    {categoryLabels[update.category] || update.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{update.content}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(update.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button onClick={() => { deleteUpdate(update.id); toast.success("Removida"); }} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <CloseCircleBold size={20} color="currentColor" />
              </button>
            </div>
          ))
        )}
      </motion.div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Publicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Nova funcionalidade de streaks!" />
            </div>
            <div className="space-y-1">
              <Label>Conteúdo</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Descreva a atualização..."
                className="w-full rounded-xl bg-muted border-0 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="feature">Nova Funcionalidade</SelectItem>
                  <SelectItem value="tip">Dica</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!form.title.trim() || !form.content.trim()}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

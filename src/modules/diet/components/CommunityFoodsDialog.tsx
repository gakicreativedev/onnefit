import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";
import { AddCircleBold, TrashBinTrashBold, GlobalBold, LockBold, MagniferBold } from "solar-icon-set";

interface CommunityFood {
  id: string;
  user_id: string;
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
  category: string;
  is_public: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FOOD = {
  name: "",
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  serving_size: "100g",
  category: "geral",
  is_public: false,
};

export default function CommunityFoodsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [foods, setFoods] = useState<CommunityFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FOOD });

  const fetchFoods = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_foods")
      .select("*")
      .order("created_at", { ascending: false });
    setFoods((data as CommunityFood[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchFoods();
  }, [open, fetchFoods]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome do alimento"); return; }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("community_foods").insert({
      ...form,
      user_id: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao cadastrar alimento");
    } else {
      toast.success(form.is_public ? "Alimento cadastrado e compartilhado com a comunidade!" : "Alimento cadastrado na sua base privada!");
      setForm({ ...EMPTY_FOOD });
      setShowForm(false);
      fetchFoods();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("community_foods").delete().eq("id", id);
    setFoods(prev => prev.filter(f => f.id !== id));
    toast.success("Alimento removido");
  };

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const myFoods = filtered.filter(f => f.user_id === user?.id);
  const publicFoods = filtered.filter(f => f.is_public && f.user_id !== user?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GlobalBold size={20} color="hsl(var(--primary))" />
            Alimentos da Comunidade
          </DialogTitle>
        </DialogHeader>

        {/* Search + Add Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagniferBold size={16} color="hsl(var(--muted-foreground))" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar alimentos..."
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="shrink-0">
            <AddCircleBold size={16} color="currentColor" className="mr-1" />
            Cadastrar
          </Button>
        </div>

        {/* Add food form */}
        {showForm && (
          <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
            <h3 className="font-bold text-sm">Novo Alimento</h3>
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Whey Protein Integral" />
            </div>
            <div className="space-y-1">
              <Label>Porção de referência</Label>
              <Input value={form.serving_size} onChange={e => setForm(p => ({ ...p, serving_size: e.target.value }))} placeholder="Ex: 100g, 1 scoop (30g)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Calorias (kcal)</Label>
                <Input type="number" min={0} value={form.calories_kcal} onChange={e => setForm(p => ({ ...p, calories_kcal: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Proteína (g)</Label>
                <Input type="number" min={0} value={form.protein_g} onChange={e => setForm(p => ({ ...p, protein_g: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Carboidrato (g)</Label>
                <Input type="number" min={0} value={form.carbs_g} onChange={e => setForm(p => ({ ...p, carbs_g: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Gordura (g)</Label>
                <Input type="number" min={0} value={form.fat_g} onChange={e => setForm(p => ({ ...p, fat_g: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Fibra (g)</Label>
                <Input type="number" min={0} value={form.fiber_g} onChange={e => setForm(p => ({ ...p, fiber_g: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="ex: proteína, fruta..." />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-background p-3">
              <Switch
                checked={form.is_public}
                onCheckedChange={v => setForm(p => ({ ...p, is_public: v }))}
              />
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {form.is_public ? <GlobalBold size={14} color="hsl(var(--primary))" /> : <LockBold size={14} color="hsl(var(--muted-foreground))" />}
                  {form.is_public ? "Público — visível para todos" : "Privado — só você vê"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {form.is_public ? "Contribua com a comunidade!" : "Apenas você terá acesso a este alimento"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FOOD }); }}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
                {saving ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <div className="space-y-4">
            {/* My foods */}
            {myFoods.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meus Alimentos</h3>
                {myFoods.map(food => (
                  <FoodCard key={food.id} food={food} isOwner onDelete={handleDelete} />
                ))}
              </div>
            )}

            {/* Public community foods */}
            {publicFoods.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Comunidade</h3>
                {publicFoods.map(food => (
                  <FoodCard key={food.id} food={food} isOwner={false} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {myFoods.length === 0 && publicFoods.length === 0 && (
              <div className="text-center py-8">
                <GlobalBold size={40} color="hsl(var(--muted-foreground))" className="mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  {search ? "Nenhum alimento encontrado" : "Ainda não há alimentos cadastrados. Seja o primeiro!"}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FoodCard({ food, isOwner, onDelete }: { food: CommunityFood; isOwner: boolean; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-card border p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{food.name}</span>
          <Badge variant={food.is_public ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
            {food.is_public ? <><GlobalBold size={10} color="currentColor" className="mr-0.5" />Público</> : <><LockBold size={10} color="currentColor" className="mr-0.5" />Privado</>}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{food.serving_size}</p>
        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{food.calories_kcal} kcal</span>
          <span>P: {food.protein_g}g</span>
          <span>C: {food.carbs_g}g</span>
          <span>G: {food.fat_g}g</span>
        </div>
      </div>
      {isOwner && (
        <button
          onClick={() => onDelete(food.id)}
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <TrashBinTrashBold size={16} color="currentColor" />
        </button>
      )}
    </div>
  );
}

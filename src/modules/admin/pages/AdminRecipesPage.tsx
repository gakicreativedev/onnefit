import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useRecipes, type Recipe } from "../hooks/useRecipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChefHatBold, AddCircleBold, CloseCircleBold, PenBold, TrashBinTrashBold } from "solar-icon-set";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

interface RecipeForm {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

const emptyForm = (): RecipeForm => ({
  title: "", description: "", ingredients: "", instructions: "",
  calories: 0, protein: 0, carbs: 0, fat: 0, category: "general",
});

function formFromRecipe(r: Recipe): RecipeForm {
  return {
    title: r.title,
    description: r.description || "",
    ingredients: r.ingredients.join(", "),
    instructions: r.instructions || "",
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    category: r.category,
  };
}

export default function AdminRecipesPage() {
  const { user } = useAuth();
  const { recipes, loading, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm());

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEdit = (r: Recipe) => {
    setEditingId(r.id);
    setForm(formFromRecipe(r));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !user) return;
    const data = {
      title: form.title,
      description: form.description || null,
      ingredients: form.ingredients.split(",").map((s) => s.trim()).filter(Boolean),
      instructions: form.instructions || null,
      calories: form.calories,
      protein: form.protein,
      carbs: form.carbs,
      fat: form.fat,
      image_url: null,
      category: form.category,
    };

    if (editingId) {
      const { error } = await updateRecipe(editingId, data);
      if (error) {
        toast.error("Erro ao atualizar receita");
      } else {
        toast.success("Receita atualizada!");
        setShowDialog(false);
      }
    } else {
      const { error } = await addRecipe(data, user.id);
      if (error) {
        toast.error("Erro ao adicionar receita");
      } else {
        toast.success("Receita adicionada!");
        setShowDialog(false);
      }
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir "${title}"?`)) return;
    await deleteRecipe(id);
    toast.success(`"${title}" removida`);
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
          <h1 className="text-2xl font-black text-foreground">Receitas <span className="text-primary">Oficiais</span></h1>
          <p className="text-sm text-muted-foreground">{recipes.length} receita(s) na base de dados</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl gap-2">
          <AddCircleBold size={18} color="currentColor" />
          Nova Receita
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
            <ChefHatBold size={48} color="currentColor" />
            <p className="text-base font-semibold">Nenhuma receita cadastrada</p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <div key={recipe.id} className="flex items-center gap-3 rounded-[16px] bg-card p-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <ChefHatBold size={24} color="currentColor" className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{recipe.title}</p>
                <p className="text-xs text-muted-foreground">
                  {recipe.calories} kcal · {recipe.protein}g prot · {recipe.carbs}g carb · {recipe.fat}g fat
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(recipe)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary transition-colors">
                  <PenBold size={16} color="currentColor" />
                </button>
                <button onClick={() => handleDelete(recipe.id, recipe.title)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                  <TrashBinTrashBold size={16} color="currentColor" />
                </button>
              </div>
            </div>
          ))
        )}
      </motion.div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Receita" : "Nova Receita Oficial"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os detalhes da receita" : "Receitas oficiais ficam visíveis para todos os usuários"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Frango grelhado com batata doce" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição" />
            </div>
            <div className="space-y-1">
              <Label>Ingredientes (separados por vírgula)</Label>
              <Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="Frango, batata doce, azeite..." />
            </div>
            <div className="space-y-1">
              <Label>Instruções</Label>
              <Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Modo de preparo..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Calorias</Label>
                <Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Proteína (g)</Label>
                <Input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Carboidrato (g)</Label>
                <Input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Gordura (g)</Label>
                <Input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>{editingId ? "Salvar Alterações" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

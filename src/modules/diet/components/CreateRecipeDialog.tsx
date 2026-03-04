import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";
import { WalletMoneyBold, CloseCircleBold, SunBold, ChefHatBold, CupHotBold, MoonBold, ClipboardTextBold, TagBold, UsersGroupRoundedBold } from "solar-icon-set";
import { ImagePickerButton } from "@/components/ui/ImagePickerButton";
import IngredientListInput, { type IngredientItem } from "./IngredientListInput";
import StepListInput from "./StepListInput";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (recipe: {
    title: string;
    description?: string | null;
    ingredients: string[];
    instructions?: string | null;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    category?: string;
    cost_level?: number;
    image_url?: string | null;
    servings?: number;
  }) => Promise<{ error: any }>;
}

const EMPTY_INGREDIENT: IngredientItem = { name: "", weight_g: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 };

export default function CreateRecipeDialog({ open, onOpenChange, onSubmit }: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [costLevel, setCostLevel] = useState(1);
  const [servings, setServings] = useState(1);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ ...EMPTY_INGREDIENT }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    return ingredients.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [ingredients]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("recipes").upload(path, imageFile, { contentType: imageFile.type });
    if (error) { toast.error("Erro ao enviar imagem"); return null; }
    const { data } = supabase.storage.from("recipes").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Informe o título da receita"); return; }
    setSaving(true);

    let image_url: string | null = null;
    if (imageFile) {
      image_url = await uploadImage();
      if (!image_url) { setSaving(false); return; }
    }

    const ingredientStrings = ingredients
      .filter(i => i.name.trim())
      .map(i => `${i.name.trim()} (${i.weight_g}${i.unit || "g"})`);

    const instructionsText = steps.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");

    const { error } = await onSubmit({
      title,
      description: description || null,
      ingredients: ingredientStrings,
      instructions: instructionsText || null,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      category,
      cost_level: costLevel,
      image_url,
      servings,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar receita");
    } else {
      toast.success("Receita criada!");
      onOpenChange(false);
      setTitle(""); setDescription(""); setCategory("general"); setCostLevel(1); setServings(1);
      setIngredients([{ ...EMPTY_INGREDIENT }]); setSteps([""]);
      removeImage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Image upload */}
          <div className="space-y-1">
            <Label>Foto da receita</Label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-2xl" />
                <button onClick={removeImage} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors">
                  <CloseCircleBold size={20} color="currentColor" className="text-destructive" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors bg-muted/30">
                  <span className="text-2xl">🖼️</span>
                  <span className="text-xs text-muted-foreground">Galeria</span>
                </button>
                <button onClick={() => cameraInputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors bg-muted/30">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs text-muted-foreground">Câmera</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Frango grelhado com batata doce" maxLength={100} />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição" maxLength={200} />
          </div>

          <IngredientListInput items={ingredients} onChange={setIngredients} />

          {/* Auto-calculated totals */}
          {totals.calories > 0 && (
            <div className="rounded-xl bg-primary/10 p-3 space-y-1">
              <div className="text-xs font-semibold text-primary">Totais calculados automaticamente</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold">{totals.calories}</div>
                  <div className="text-[10px] text-muted-foreground">kcal</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{totals.protein}g</div>
                  <div className="text-[10px] text-muted-foreground">Proteína</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{totals.carbs}g</div>
                  <div className="text-[10px] text-muted-foreground">Carbo</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{totals.fat}g</div>
                  <div className="text-[10px] text-muted-foreground">Gordura</div>
                </div>
              </div>
            </div>
          )}

          <StepListInput steps={steps} onChange={setSteps} />

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general"><span className="flex items-center gap-1.5"><ClipboardTextBold size={14} color="currentColor" /> Geral</span></SelectItem>
                  <SelectItem value="breakfast"><span className="flex items-center gap-1.5"><SunBold size={14} color="currentColor" /> Café</span></SelectItem>
                  <SelectItem value="lunch"><span className="flex items-center gap-1.5"><ChefHatBold size={14} color="currentColor" /> Almoço</span></SelectItem>
                  <SelectItem value="snack"><span className="flex items-center gap-1.5"><CupHotBold size={14} color="currentColor" /> Lanche</span></SelectItem>
                  <SelectItem value="dinner"><span className="flex items-center gap-1.5"><MoonBold size={14} color="currentColor" /> Janta</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <WalletMoneyBold size={14} color="currentColor" className="text-primary" />
                Custo
              </Label>
              <Select value={String(costLevel)} onValueChange={v => setCostLevel(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1"><span className="flex items-center gap-1.5"><TagBold size={14} color="currentColor" className="text-green-500" /> Barato</span></SelectItem>
                  <SelectItem value="2"><span className="flex items-center gap-1.5"><TagBold size={14} color="currentColor" className="text-yellow-500" /> Médio</span></SelectItem>
                  <SelectItem value="3"><span className="flex items-center gap-1.5"><TagBold size={14} color="currentColor" className="text-red-500" /> Caro</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <UsersGroupRoundedBold size={14} color="currentColor" className="text-primary" />
                Porções
              </Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={servings}
                onChange={e => setServings(Math.max(1, Number(e.target.value)))}
                className="text-center"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || saving}>
            {saving ? "Salvando..." : "Criar Receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

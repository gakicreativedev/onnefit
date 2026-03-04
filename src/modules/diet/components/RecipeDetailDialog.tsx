import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useRecipeComments, useRecipeRating, type Recipe } from "../hooks/useRecipes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  StarBold, StarLinear, ChatRoundDotsBold, TrashBinTrashBold,
  SendSquareBold, WalletMoneyBold, BookmarkBold, BookmarkLinear,
  ShareBold, PenBold
} from "solar-icon-set";

interface Props {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (recipeId: string) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
}

const COST_LABELS = ["", "Barato", "Médio", "Caro"];
const COST_COLORS = ["", "text-green-500", "text-yellow-500", "text-red-500"];

export default function RecipeDetailDialog({ recipe, open, onOpenChange, isBookmarked, onToggleBookmark, onEdit, onDelete }: Props) {
  const { user } = useAuth();
  const { comments, loading: commentsLoading, addComment, deleteComment } = useRecipeComments(recipe?.id ?? null);
  const { myRating, avg, count, rate } = useRecipeRating(recipe?.id ?? null);
  const [newComment, setNewComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [sharing, setSharing] = useState(false);

  if (!recipe) return null;

  const costLevel = recipe.cost_level || 1;
  const isOwner = user?.id === recipe.created_by;

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    await addComment(newComment.trim(), user.id);
    setNewComment("");
    toast.success("Comentário adicionado!");
  };

  const handleShareToFeed = async () => {
    if (!user || !recipe) return;
    setSharing(true);
    const content = `Confira esta receita: **${recipe.title}**${recipe.description ? `\n${recipe.description}` : ""}\n\n${recipe.calories ?? 0} kcal · ${recipe.protein ?? 0}g prot · ${recipe.carbs ?? 0}g carb · ${recipe.fat ?? 0}g gord${recipe.ingredients?.length ? `\n\nIngredientes: ${recipe.ingredients.join(", ")}` : ""}`;

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content,
      image_url: recipe.image_url || null,
      tags: ["receita", recipe.category || "geral"],
    });

    setSharing(false);
    if (error) {
      toast.error("Erro ao compartilhar no feed");
    } else {
      toast.success("Receita compartilhada no feed!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Image */}
        {recipe.image_url && (
          <div className="w-full h-48 overflow-hidden rounded-t-lg">
            <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        )}
        {/* Header */}
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-black pr-16">{recipe.title}</DialogTitle>
          </DialogHeader>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isOwner && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl gap-2"
                onClick={() => { onEdit(recipe); onOpenChange(false); }}
              >
                <PenBold size={16} color="currentColor" />
                Editar
              </Button>
            )}
            {isOwner && onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  if (window.confirm("Tem certeza que deseja excluir esta receita?")) {
                    onDelete(recipe.id);
                    onOpenChange(false);
                    toast.success("Receita excluída!");
                  }
                }}
              >
                <TrashBinTrashBold size={16} color="currentColor" />
                Excluir
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl gap-2"
              onClick={handleShareToFeed}
              disabled={sharing}
            >
              <ShareBold size={16} color="currentColor" />
              {sharing ? "Enviando..." : "Compartilhar"}
            </Button>
            {onToggleBookmark && (
              <Button
                variant={isBookmarked ? "default" : "outline"}
                size="sm"
                className="rounded-2xl gap-2"
                onClick={() => onToggleBookmark(recipe.id)}
              >
                {isBookmarked ? (
                  <BookmarkBold size={16} color="currentColor" />
                ) : (
                  <BookmarkLinear size={16} color="currentColor" />
                )}
                {isBookmarked ? "Salvo" : "Salvar"}
              </Button>
            )}
          </div>

          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-3">{recipe.description}</p>
          )}

          {/* Rating + Cost */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hoveredStar || myRating || 0);
                return (
                  <button
                    key={star}
                    onClick={() => rate(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-110"
                  >
                    {filled ? (
                      <StarBold size={20} color="currentColor" className="text-yellow-400" />
                    ) : (
                      <StarLinear size={20} color="currentColor" className="text-muted-foreground/40" />
                    )}
                  </button>
                );
              })}
              <span className="text-sm font-bold text-foreground ml-1">{avg.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({count})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <WalletMoneyBold size={16} color="currentColor" className={COST_COLORS[costLevel]} />
              <span className={`text-xs font-bold ${COST_COLORS[costLevel]}`}>{COST_LABELS[costLevel]}</span>
              <div className="flex gap-0.5 ml-0.5">
                {[1, 2, 3].map((l) => (
                  <div key={l} className={`h-2 w-2 rounded-full ${l <= costLevel ? "bg-current " + COST_COLORS[costLevel] : "bg-muted-foreground/20"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { v: recipe.calories ?? 0, l: "kcal", primary: true },
              { v: `${recipe.protein ?? 0}g`, l: "Prot" },
              { v: `${recipe.carbs ?? 0}g`, l: "Carb" },
              { v: `${recipe.fat ?? 0}g`, l: "Gord" },
            ].map((x, i) => (
              <div key={i} className="rounded-xl bg-muted/50 p-2.5 text-center">
                <p className={`text-lg font-bold ${x.primary ? "text-primary" : "text-foreground"}`}>{x.v}</p>
                <p className="text-[10px] text-muted-foreground">{x.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="px-6 mt-4">
            <h4 className="text-sm font-bold text-foreground mb-2">Ingredientes</h4>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions && (
          <div className="px-6 mt-4">
            <h4 className="text-sm font-bold text-foreground mb-2">Modo de Preparo</h4>
            <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {recipe.instructions}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="px-6 mt-5 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <ChatRoundDotsBold size={18} color="currentColor" className="text-primary" />
            <h4 className="text-sm font-bold text-foreground">Comentários ({comments.length})</h4>
          </div>

          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum comentário ainda. Seja o primeiro!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={c.author_avatar || ""} />
                    <AvatarFallback className="text-[10px]">{(c.author_name || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-foreground">{c.author_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.content}</p>
                  </div>
                  {user?.id === c.user_id && (
                    <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 self-start">
                      <TrashBinTrashBold size={14} color="currentColor" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1"
              maxLength={500}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            />
            <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()}>
              <SendSquareBold size={18} color="currentColor" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePickerButton } from "@/components/ui/ImagePickerButton";
import { HashtagBold, CloseCircleBold, WomenBold } from "solar-icon-set";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string, image?: File, tags?: string[], womenOnly?: boolean) => Promise<void>;
  womenOnly?: boolean;
}

export function CreatePostDialog({ open, onOpenChange, onSubmit, womenOnly = false }: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelected = (file: File) => {
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const addTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9áàâãéèêíïóôõúçñ]/gi, "");
    if (clean && !tags.includes(clean) && tags.length < 5) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!content.trim() && !image) return;
    setSubmitting(true);
    await onSubmit(content, image || undefined, tags, womenOnly);
    setContent("");
    setImage(null);
    setPreview(null);
    setTags([]);
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            {womenOnly ? (
              <>
                <WomenBold size={20} color="hsl(var(--destructive))" />
                Post Feminino
              </>
            ) : "Novo Post"}
          </DialogTitle>
          {womenOnly && (
            <p className="text-xs text-muted-foreground">Este post será visível apenas para mulheres</p>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="O que você está pensando? Use #hashtags para categorizar"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none bg-muted/30 border-border"
          />

          {/* Tags input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <HashtagBold
                  size={16}
                  color="hsl(var(--muted-foreground))"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Adicionar tag..."
                  className="w-full h-9 rounded-full bg-muted/30 border border-border pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-colors"
                  maxLength={20}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="rounded-full h-9 px-3 text-xs"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold"
                  >
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:opacity-70">
                      <CloseCircleBold size={14} color="currentColor" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {preview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-cover" />
              <button
                onClick={() => { setImage(null); setPreview(null); }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 text-foreground flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <ImagePickerButton onImageSelected={handleImageSelected} variant="full">
              <button
                type="button"
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <span className="text-sm font-semibold">📷 Foto</span>
              </button>
            </ImagePickerButton>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (!content.trim() && !image)}
              className="rounded-xl px-6"
            >
              {submitting ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

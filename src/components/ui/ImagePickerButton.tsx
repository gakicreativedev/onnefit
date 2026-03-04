import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GalleryBold } from "solar-icon-set";
import { Camera } from "lucide-react";

interface ImagePickerButtonProps {
    /** Called when an image is selected (from gallery or camera) */
    onImageSelected: (file: File) => void;
    /** Accept attribute for the file input */
    accept?: string;
    /** Custom trigger element; if not provided, uses a default icon button */
    children?: React.ReactNode;
    /** Additional className for the trigger */
    className?: string;
    /** Whether to disable the button */
    disabled?: boolean;
    /** Variant for the dropdown label */
    variant?: "icon" | "full";
}

/**
 * Reusable image picker that offers Gallery and Camera options.
 * On mobile, `capture="environment"` opens the device camera directly.
 */
export function ImagePickerButton({
    onImageSelected,
    accept = "image/*",
    children,
    className,
    disabled = false,
    variant = "icon",
}: ImagePickerButtonProps) {
    const galleryRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onImageSelected(file);
        e.target.value = "";
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    {children || (
                        <Button
                            variant="outline"
                            size={variant === "icon" ? "icon" : "default"}
                            className={className || "rounded-xl"}
                            type="button"
                        >
                            <GalleryBold size={18} color="currentColor" />
                            {variant === "full" && <span className="ml-2">Imagem</span>}
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl min-w-[180px]">
                    <DropdownMenuItem
                        onClick={() => galleryRef.current?.click()}
                        className="gap-2 py-2.5 cursor-pointer"
                    >
                        <GalleryBold size={16} color="currentColor" className="text-primary" />
                        <span>Galeria</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => cameraRef.current?.click()}
                        className="gap-2 py-2.5 cursor-pointer"
                    >
                        <Camera size={16} className="text-primary" />
                        <span>Câmera</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden inputs */}
            <input
                ref={galleryRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFile}
            />
            <input
                ref={cameraRef}
                type="file"
                accept={accept}
                capture="environment"
                className="hidden"
                onChange={handleFile}
            />
        </>
    );
}

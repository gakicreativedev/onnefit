interface OptionCardProps {
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}

export function OptionCard({ label, desc, selected, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
      }`}
    >
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}

import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SplitManager({ days, onChange }) {
  const [newDay, setNewDay] = useState("");

  const addDay = () => {
    const trimmed = newDay.trim();
    if (!trimmed) return;
    onChange([...days, trimmed]);
    setNewDay("");
  };

  const removeDay = (idx) => onChange(days.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Split</p>
      <div className="space-y-1.5">
        {days.map((day, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground flex-1">
              <span className="text-muted-foreground mr-2">Day {idx + 1}</span>{day}
            </span>
            <button onClick={() => removeDay(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {days.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No days added yet</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={newDay}
          onChange={(e) => setNewDay(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDay()}
          placeholder={`Day ${days.length + 1} name (e.g. Chest & Triceps)`}
          className="bg-secondary border-0 rounded-xl h-9 text-sm"
        />
        <Button size="sm" variant="secondary" className="rounded-xl shrink-0" onClick={addDay} disabled={!newDay.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
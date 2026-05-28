import { useState } from "react";
import { Plus, Copy, Trash2, Flame, Trophy, ChevronDown, ChevronUp, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PreviousPerformance from "./PreviousPerformance";

function detectTopSet(sets) {
  let topIdx = -1;
  let topWeight = -1;
  let topReps = -1;
  sets.forEach((s, i) => {
    if (s.is_warmup) return;
    if (s.weight > topWeight || (s.weight === topWeight && s.reps > topReps)) {
      topWeight = s.weight;
      topReps = s.reps;
      topIdx = i;
    }
  });
  return topIdx;
}

export default function ExerciseBlock({ exercise, onUpdate, onRemove, previousWorkouts }) {
  const [showHistory, setShowHistory] = useState(false);
  const sets = exercise.sets || [];
  const topIdx = detectTopSet(sets);

  const updateSet = (idx, field, value) => {
    const newSets = [...sets];
    newSets[idx] = { ...newSets[idx], [field]: value };
    onUpdate({ ...exercise, sets: newSets });
  };

  const addSet = () => {
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : { weight: 0, reps: 0 };
    onUpdate({ ...exercise, sets: [...sets, { weight: lastSet.weight, reps: lastSet.reps, is_warmup: false, is_top_set: false, notes: "", side: lastSet.side || null }] });
  };

  const duplicateSet = (idx) => {
    const newSets = [...sets];
    newSets.splice(idx + 1, 0, { ...sets[idx] });
    onUpdate({ ...exercise, sets: newSets });
  };

  const removeSet = (idx) => {
    onUpdate({ ...exercise, sets: sets.filter((_, i) => i !== idx) });
  };

  const totalVolume = sets.reduce((sum, s) => sum + (s.is_warmup ? 0 : (s.weight || 0) * (s.reps || 0)), 0);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground">{exercise.exercise_name}</h3>
          <p className="text-xs text-muted-foreground">{exercise.muscle_group}</p>
        </div>
        <div className="flex items-center gap-2">
          {totalVolume > 0 && (
            <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
              {totalVolume.toLocaleString()} lb
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showHistory && <PreviousPerformance exerciseName={exercise.exercise_name} workouts={previousWorkouts} />}

      <div className="px-4 pb-2">
        <div className={`grid gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1 ${exercise.is_unilateral ? "grid-cols-12" : "grid-cols-12"}`}>
          <div className="col-span-1">Set</div>
          <div className="col-span-3">Weight</div>
          <div className="col-span-2">Reps</div>
          {exercise.is_unilateral && <div className="col-span-2">Side</div>}
          <div className={exercise.is_unilateral ? "col-span-4" : "col-span-6"}></div>
        </div>

        {sets.map((set, idx) => (
          <div key={idx} className={`grid grid-cols-12 gap-2 items-center py-1.5 rounded-lg px-1 mb-1 transition-all ${
            idx === topIdx ? "bg-accent/10 ring-1 ring-accent/30" : set.is_warmup ? "opacity-60" : ""
          }`}>
            <div className="col-span-1 flex items-center">
              {idx === topIdx ? (
                <Trophy className="w-3.5 h-3.5 text-accent" />
              ) : set.is_warmup ? (
                <Flame className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
              )}
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={set.weight || ""}
                onChange={(e) => updateSet(idx, "weight", Number(e.target.value))}
                className="h-8 text-sm bg-secondary border-0 text-center font-semibold"
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={set.reps || ""}
                onChange={(e) => updateSet(idx, "reps", Number(e.target.value))}
                className="h-8 text-sm bg-secondary border-0 text-center font-semibold"
                placeholder="0"
              />
            </div>
            {exercise.is_unilateral && (
              <div className="col-span-2 flex gap-0.5">
                {["L", "R"].map((s) => (
                  <button key={s} onClick={() => updateSet(idx, "side", set.side === s ? null : s)}
                    className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
                      set.side === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}>{s}</button>
                ))}
              </div>
            )}
            <div className={`${exercise.is_unilateral ? "col-span-4" : "col-span-6"} flex items-center justify-end gap-1`}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => updateSet(idx, "is_warmup", !set.is_warmup)}>
                <Flame className={`w-3.5 h-3.5 ${set.is_warmup ? "text-orange-400" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => duplicateSet(idx)}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeSet(idx)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <Button variant="ghost" className="w-full h-10 border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary" onClick={addSet}>
          <Plus className="w-4 h-4 mr-2" /> Add Set
        </Button>
      </div>
    </div>
  );
}
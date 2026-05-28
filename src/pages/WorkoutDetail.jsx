import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Dumbbell, TrendingUp, Trophy, Flame, Pencil, Trash2, Check, X, Plus, Share2 } from "lucide-react";
import WorkoutShareCard from "../components/WorkoutShareCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import moment from "moment";

const CATEGORIES = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Arms", "Chest", "Back", "Shoulders", "Custom"];

function detectTopSet(sets) {
  let top = null;
  sets?.forEach((s) => {
    if (s.is_warmup) return;
    if (!top || s.weight > top.weight || (s.weight === top.weight && s.reps > top.reps)) top = s;
  });
  return top;
}

function recalcExercise(ex) {
  const top = detectTopSet(ex.sets);
  const vol = ex.sets.reduce((s, set) => s + (set.is_warmup ? 0 : (set.weight || 0) * (set.reps || 0)), 0);
  return { ...ex, top_set_weight: top?.weight || 0, top_set_reps: top?.reps || 0, total_volume: vol };
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    base44.entities.Workout.get(id).then((w) => {
      setWorkout(w);
      setDraft(JSON.parse(JSON.stringify(w)));
    });
  }, [id]);

  const handleDelete = async () => {
    await base44.entities.Workout.delete(id);
    navigate("/history");
  };

  const handleSave = async () => {
    setSaving(true);
    const recalcedExercises = (draft.exercises || []).map(recalcExercise);
    const totalVol = recalcedExercises.reduce((s, e) => s + (e.total_volume || 0), 0);
    const updated = { ...draft, exercises: recalcedExercises, total_volume: totalVol };
    await base44.entities.Workout.update(id, updated);
    setWorkout(updated);
    setDraft(JSON.parse(JSON.stringify(updated)));
    setEditing(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setDraft(JSON.parse(JSON.stringify(workout)));
    setEditing(false);
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const exs = [...draft.exercises];
    exs[exIdx] = { ...exs[exIdx], sets: exs[exIdx].sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s) };
    setDraft({ ...draft, exercises: exs });
  };

  const addSet = (exIdx) => {
    const exs = [...draft.exercises];
    const last = exs[exIdx].sets[exs[exIdx].sets.length - 1] || { weight: 0, reps: 0 };
    exs[exIdx] = { ...exs[exIdx], sets: [...exs[exIdx].sets, { weight: last.weight, reps: last.reps, is_warmup: false, is_top_set: false, side: last.side || null }] };
    setDraft({ ...draft, exercises: exs });
  };

  const removeSet = (exIdx, setIdx) => {
    const exs = [...draft.exercises];
    exs[exIdx] = { ...exs[exIdx], sets: exs[exIdx].sets.filter((_, i) => i !== setIdx) };
    setDraft({ ...draft, exercises: exs });
  };

  if (!workout) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const display = editing ? draft : workout;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="text-xl font-black bg-secondary border-0 h-9" />
          ) : (
            <h1 className="text-xl font-black text-foreground truncate">{workout.name}</h1>
          )}
          <p className="text-xs text-muted-foreground">{moment(workout.started_at).format("ddd, MMM D · h:mm A")}</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="rounded-full" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" className="rounded-full gap-1" onClick={handleSave} disabled={saving}>
              <Check className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowShare(true)}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete workout?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete "{workout.name}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-secondary border-0">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Clock, label: "Duration", value: `${Math.round((workout.duration_seconds || 0) / 60)}m` },
          { icon: Dumbbell, label: "Exercises", value: display.exercises?.length || 0 },
          { icon: TrendingUp, label: "Volume", value: `${((display.total_volume || 0) / 1000).toFixed(1)}k` },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-3 text-center">
            <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-black text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category edit */}
      {editing && (
        <div className="mb-4">
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
            <SelectTrigger className="bg-secondary border-0 rounded-full w-auto h-8 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {(display.exercises || []).map((ex, exIdx) => {
          const topIdx = editing ? -1 : ex.sets?.findIndex((s) => s.is_top_set);
          return (
            <div key={exIdx} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-foreground">{ex.exercise_name}</h3>
                  <p className="text-xs text-muted-foreground">{ex.muscle_group}</p>
                </div>
                {!editing && ex.top_set_weight > 0 && (
                  <div className="flex items-center gap-1.5 bg-accent/10 rounded-full px-3 py-1">
                    <Trophy className="w-3.5 h-3.5 text-accent" />
                    <span className="text-sm font-black text-accent">{ex.top_set_weight} × {ex.top_set_reps}</span>
                  </div>
                )}
              </div>

              {editing && (
                <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Weight</div>
                  <div className="col-span-3">Reps</div>
                  {ex.is_unilateral && <div className="col-span-2">Side</div>}
                  <div className={ex.is_unilateral ? "col-span-2" : "col-span-4"}></div>
                </div>
              )}

              <div className="space-y-1">
                {(ex.sets || []).map((set, setIdx) => (
                  editing ? (
                    <div key={setIdx} className="grid grid-cols-12 gap-2 items-center py-1">
                      <span className="col-span-1 text-xs text-muted-foreground text-center">{setIdx + 1}</span>
                      <div className="col-span-4">
                        <Input type="number" value={set.weight || ""} onChange={(e) => updateSet(exIdx, setIdx, "weight", Number(e.target.value))}
                          className="h-8 text-sm bg-secondary border-0 text-center font-semibold" placeholder="0" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" value={set.reps || ""} onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                          className="h-8 text-sm bg-secondary border-0 text-center font-semibold" placeholder="0" />
                      </div>
                      {ex.is_unilateral && (
                        <div className="col-span-2 flex gap-0.5">
                          {["L", "R"].map((s) => (
                            <button key={s} onClick={() => updateSet(exIdx, setIdx, "side", set.side === s ? null : s)}
                              className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
                                set.side === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                              }`}>{s}</button>
                          ))}
                        </div>
                      )}
                      <div className="col-span-2 flex justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSet(exIdx, setIdx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={setIdx} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg text-sm ${set.is_top_set ? "bg-accent/10" : set.is_warmup ? "opacity-50" : ""}`}>
                      <span className="w-6 text-center">
                        {set.is_top_set ? <Trophy className="w-3.5 h-3.5 text-accent inline" /> : set.is_warmup ? <Flame className="w-3.5 h-3.5 text-muted-foreground inline" /> : <span className="text-muted-foreground">{setIdx + 1}</span>}
                      </span>
                      <span className="font-bold text-foreground">{set.weight} lb</span>
                      <span className="text-muted-foreground">×</span>
                      <span className="font-bold text-foreground">{set.reps}</span>
                      {set.side && <span className="text-xs font-bold text-primary ml-auto">{set.side}</span>}
                    </div>
                  )
                ))}
              </div>

              {editing && (
                <Button variant="ghost" className="w-full mt-2 h-8 border border-dashed border-border text-muted-foreground text-xs hover:text-primary hover:border-primary"
                  onClick={() => addSet(exIdx)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Set
                </Button>
              )}

              {!editing && (
                <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
                  <span>{ex.sets?.filter((s) => !s.is_warmup).length} working sets</span>
                  <span>{(ex.total_volume || 0).toLocaleString()} lb volume</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showShare && (
        <WorkoutShareCard workout={workout} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
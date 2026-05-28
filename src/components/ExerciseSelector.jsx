import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Star, X, Dumbbell, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const MUSCLE_GROUPS = ["All", "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];

export default function ExerciseSelector({ open, onClose, onSelect }) {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("Chest");
  const [newEquipment, setNewEquipment] = useState("Barbell");

  useEffect(() => {
    if (open) base44.entities.Exercise.list("-is_favorite", 200).then(setExercises);
  }, [open]);

  if (!open) return null;

  const filtered = exercises.filter((e) => {
    if (filter !== "All" && e.muscle_group !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const EQUIPMENTS = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Band", "Other"];
  const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Full Body"];

  const createAndSelect = async () => {
    if (!newName.trim()) return;
    const created = await base44.entities.Exercise.create({ name: newName.trim(), muscle_group: newMuscle, equipment: newEquipment, is_custom: true, is_favorite: false, is_unilateral: false });
    onSelect(created);
    onClose();
  };

  const toggleFav = async (e, ev) => {
    ev.stopPropagation();
    await base44.entities.Exercise.update(e.id, { is_favorite: !e.is_favorite });
    setExercises((prev) => prev.map((ex) => ex.id === e.id ? { ...ex, is_favorite: !ex.is_favorite } : ex));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercises..." className="pl-9 bg-secondary border-0" />
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {MUSCLE_GROUPS.map((m) => (
          <Badge key={m} variant={filter === m ? "default" : "secondary"} className="cursor-pointer shrink-0 rounded-full"
            onClick={() => setFilter(m)}>
            {m}
          </Badge>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-1">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => { onSelect(e); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.muscle_group} · {e.equipment}{e.is_unilateral ? " · Unilateral" : ""}</p>
              </div>
              <button onClick={(ev) => toggleFav(e, ev)} className="p-1">
                <Star className={`w-4 h-4 ${e.is_favorite ? "text-accent fill-accent" : "text-muted-foreground"}`} />
              </button>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No exercises found</p>
          )}
          <div className="pt-4 border-t border-border mt-2">
            {!creating ? (
              <button onClick={() => setCreating(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors">
                <Plus className="w-5 h-5" />
                <span className="text-sm font-semibold">Create Custom Exercise</span>
              </button>
            ) : (
              <div className="space-y-3 p-3 bg-secondary rounded-xl">
                <p className="text-sm font-bold text-foreground">New Exercise</p>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Exercise name" className="bg-card border-0" autoFocus />
                <div className="flex gap-2">
                  <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value)}
                    className="flex-1 h-9 rounded-md bg-card text-foreground text-sm px-2 border-0 outline-none">
                    {MUSCLES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={newEquipment} onChange={(e) => setNewEquipment(e.target.value)}
                    className="flex-1 h-9 rounded-md bg-card text-foreground text-sm px-2 border-0 outline-none">
                    {EQUIPMENTS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setCreating(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={createAndSelect} disabled={!newName.trim()}>Add &amp; Select</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
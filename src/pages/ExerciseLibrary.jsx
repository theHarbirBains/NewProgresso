import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Star, Dumbbell, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const GROUPS = ["All", "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Full Body"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Band", "Other"];

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [equipFilter, setEquipFilter] = useState("All");
  const [showFavs, setShowFavs] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [form, setForm] = useState({ name: "", muscle_group: "Chest", equipment: "Barbell", is_unilateral: false });

  const load = () => base44.entities.Exercise.list("-is_favorite", 200).then(setExercises);
  useEffect(() => { load(); }, []);

  const filtered = exercises.filter((e) => {
    if (showFavs && !e.is_favorite) return false;
    if (showCustom && !e.is_custom) return false;
    if (filter !== "All" && e.muscle_group !== filter) return false;
    if (equipFilter !== "All" && e.equipment !== equipFilter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteExercise = async (e) => {
    await base44.entities.Exercise.delete(e.id);
    setExercises((prev) => prev.filter((ex) => ex.id !== e.id));
  };

  const toggleFav = async (e) => {
    await base44.entities.Exercise.update(e.id, { is_favorite: !e.is_favorite });
    setExercises((prev) => prev.map((ex) => ex.id === e.id ? { ...ex, is_favorite: !ex.is_favorite } : ex));
  };

  const openCreate = () => {
    setEditingExercise(null);
    setForm({ name: "", muscle_group: "Chest", equipment: "Barbell", is_unilateral: false });
    setDialogOpen(true);
  };

  const openEdit = (e) => {
    setEditingExercise(e);
    setForm({ name: e.name, muscle_group: e.muscle_group, equipment: e.equipment, is_unilateral: e.is_unilateral || false });
    setDialogOpen(true);
  };

  const saveExercise = async () => {
    if (!form.name) return;
    if (editingExercise) {
      await base44.entities.Exercise.update(editingExercise.id, form);
    } else {
      await base44.entities.Exercise.create({ ...form, is_custom: true, is_favorite: false });
    }
    setDialogOpen(false);
    load();
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Exercises</h1>
        <Button size="sm" className="rounded-full gap-1" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-card border-border" />
      </div>

      {/* Filter row 1: type filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 pb-1">
        <Badge variant={showFavs ? "default" : "secondary"} className="cursor-pointer shrink-0 rounded-full gap-1"
          onClick={() => setShowFavs(!showFavs)}>
          <Star className="w-3 h-3" /> Favorites
        </Badge>
        <Badge variant={showCustom ? "default" : "secondary"} className="cursor-pointer shrink-0 rounded-full"
          onClick={() => setShowCustom(!showCustom)}>Custom</Badge>
        {GROUPS.map((g) => (
          <Badge key={g} variant={filter === g ? "default" : "secondary"} className="cursor-pointer shrink-0 rounded-full"
            onClick={() => setFilter(g)}>{g}</Badge>
        ))}
      </div>

      {/* Filter row 2: equipment */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {["All", ...EQUIPMENT].map((eq) => (
          <Badge key={eq} variant={equipFilter === eq ? "default" : "secondary"} className="cursor-pointer shrink-0 rounded-full"
            onClick={() => setEquipFilter(eq)}>{eq}</Badge>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-card transition-colors">
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
              <p className="text-xs text-muted-foreground">{e.muscle_group} · {e.equipment}{e.is_custom ? " · Custom" : ""}{e.is_unilateral ? " · Unilateral" : ""}</p>
            </div>
            <button onClick={() => openEdit(e)} className="p-2">
              <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={() => toggleFav(e)} className="p-2">
              <Star className={`w-4 h-4 ${e.is_favorite ? "text-accent fill-accent" : "text-muted-foreground"}`} />
            </button>
            {e.is_custom && (
              <button onClick={() => deleteExercise(e)} className="p-2">
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No exercises found</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{editingExercise ? "Edit Exercise" : "New Exercise"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-0" />
            </div>
            <div>
              <Label>Muscle Group</Label>
              <Select value={form.muscle_group} onValueChange={(v) => setForm({ ...form, muscle_group: v })}>
                <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS.filter((g) => g !== "All").map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipment</Label>
              <Select value={form.equipment} onValueChange={(v) => setForm({ ...form, equipment: v })}>
                <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
                <SelectContent>{EQUIPMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unilateral (single side)</Label>
              <div className="flex gap-2 mt-1">
                {[{ label: "No", value: false }, { label: "Yes", value: true }].map(({ label, value }) => (
                  <button key={label} onClick={() => setForm({ ...form, is_unilateral: value })}
                    className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${
                      form.is_unilateral === value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}>{label}</button>
                ))}
              </div>
            </div>
            <Button onClick={saveExercise} className="w-full">{editingExercise ? "Save Changes" : "Create Exercise"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
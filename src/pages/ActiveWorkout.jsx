import { useState, useEffect, useRef } from "react";
import SplitManager from "../components/SplitManager";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Plus, Timer, Check, X, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import ExerciseBlock from "../components/ExerciseBlock";
import ExerciseSelector from "../components/ExerciseSelector";
import RestTimer from "../components/RestTimer";

const CATEGORIES = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Arms", "Chest", "Back", "Shoulders", "Custom"];
const STORAGE_KEY = "activeWorkout";
const SPLIT_KEY = "workoutSplit";

function loadSplit() {
  try { return JSON.parse(localStorage.getItem(SPLIT_KEY)) || []; } catch { return []; }
}
function saveSplit(days) {
  localStorage.setItem(SPLIT_KEY, JSON.stringify(days));
}

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function detectTopSet(sets) {
  let top = null;
  sets?.forEach((s) => {
    if (s.is_warmup) return;
    if (!top || s.weight > top.weight || (s.weight === top.weight && s.reps > top.reps)) top = s;
  });
  return top;
}

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const saved = loadSaved();

  const [name, setName] = useState(saved?.name || "Workout");
  const [category, setCategory] = useState(saved?.category || "Push");
  const [exercises, setExercises] = useState(saved?.exercises || []);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [startedAt] = useState(saved?.startedAt || new Date().toISOString());
  const [elapsed, setElapsed] = useState(() =>
    saved?.startedAt ? Math.floor((Date.now() - new Date(saved.startedAt).getTime()) / 1000) : 0
  );
  const [previousWorkouts, setPreviousWorkouts] = useState([]);
  const [started, setStarted] = useState(!!saved);
  const [saving, setSaving] = useState(false);
  const [splitDays, setSplitDays] = useState(() => loadSplit());
  const [selectedSplitDay, setSelectedSplitDay] = useState("");
  const [managingSplit, setManagingSplit] = useState(false);

  const handleSplitChange = (days) => {
    setSplitDays(days);
    saveSplit(days);
  };

  const handleSplitDaySelect = (dayName) => {
    setSelectedSplitDay(dayName);
    setName(dayName);
  };
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExMuscle, setNewExMuscle] = useState("Chest");
  const [newExEquipment, setNewExEquipment] = useState("Barbell");
  const timerRef = useRef(null);

  const MUSCLES = ["Chest","Back","Shoulders","Biceps","Triceps","Forearms","Quads","Hamstrings","Glutes","Calves","Core","Full Body"];
  const EQUIPMENTS = ["Barbell","Dumbbell","Cable","Machine","Bodyweight","Kettlebell","Band","Other"];

  const createAndAddExercise = async () => {
    if (!newExName.trim()) return;
    const created = await base44.entities.Exercise.create({ name: newExName.trim(), muscle_group: newExMuscle, equipment: newExEquipment, is_custom: true, is_favorite: false, is_unilateral: false });
    addExercise(created);
    setCreatingExercise(false);
    setNewExName("");
  };

  const beginWorkout = () => {
    setStarted(true);
  };

  // Keep timer ticking using absolute start time so it's accurate after navigation
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    base44.entities.Workout.filter({ status: "completed" }, "-started_at", 30).then(setPreviousWorkouts);
    return () => clearInterval(timerRef.current);
  }, [startedAt]);

  // Only persist to localStorage once the workout has actually been started
  useEffect(() => {
    if (!started) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, category, exercises, startedAt }));
  }, [name, category, exercises, startedAt, started]);

  const fmt = (s) => `${Math.floor(s / 3600).toString().padStart(2, "0")}:${Math.floor((s % 3600) / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const addExercise = (ex) => {
    setExercises((prev) => [...prev, {
      exercise_id: ex.id,
      exercise_name: ex.name,
      muscle_group: ex.muscle_group,
      is_unilateral: ex.is_unilateral || false,
      sets: [{ weight: 0, reps: 0, is_warmup: false, is_top_set: false, notes: "", side: null }],
    }]);
  };

  const updateExercise = (idx, data) => setExercises((prev) => prev.map((e, i) => i === idx ? data : e));
  const removeExercise = (idx) => setExercises((prev) => prev.filter((_, i) => i !== idx));

  const cancelWorkout = () => {
    localStorage.removeItem(STORAGE_KEY);
    navigate("/");
  };

  const finishWorkout = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const processedExercises = exercises.map((ex) => {
      const top = detectTopSet(ex.sets);
      const vol = ex.sets.reduce((s, set) => s + (set.is_warmup ? 0 : (set.weight || 0) * (set.reps || 0)), 0);
      const sets = ex.sets.map((set, i) => {
        const isTop = top && set.weight === top.weight && set.reps === top.reps;
        return { ...set, is_top_set: isTop && ex.sets.findIndex((s2) => s2.weight === top.weight && s2.reps === top.reps) === i };
      });
      return { ...ex, sets, top_set_weight: top?.weight || 0, top_set_reps: top?.reps || 0, total_volume: vol };
    });

    const totalVol = processedExercises.reduce((s, e) => s + (e.total_volume || 0), 0);

    // Clear storage before saving so indicator disappears
    localStorage.removeItem(STORAGE_KEY);

    await base44.entities.Workout.create({
      name, category, started_at: startedAt, ended_at: now,
      duration_seconds: elapsed, status: "completed", total_volume: totalVol,
      exercises: processedExercises, tags: [], notes: "",
    });

    // Check for PRs
    for (const ex of processedExercises) {
      if (ex.top_set_weight > 0) {
        const existingPRs = await base44.entities.PersonalRecord.filter({ exercise_name: ex.exercise_name }, "-weight", 1);
        const currentBest = existingPRs[0];
        if (!currentBest || ex.top_set_weight > currentBest.weight || (ex.top_set_weight === currentBest.weight && ex.top_set_reps > currentBest.reps)) {
          const e1rm = ex.top_set_weight * (1 + ex.top_set_reps / 30);
          await base44.entities.PersonalRecord.create({
            exercise_name: ex.exercise_name, exercise_id: ex.exercise_id,
            weight: ex.top_set_weight, reps: ex.top_set_reps,
            estimated_1rm: Math.round(e1rm), date: now,
          });
        }
      }
    }

    navigate("/history");
  };

  if (!started) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 pb-32 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground">Start Workout</h1>
        </div>

        {/* Split section */}
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Workout Split</p>
            <button
              onClick={() => setManagingSplit((v) => !v)}
              className="text-xs text-primary font-semibold">
              {managingSplit ? "Done" : "Edit Split"}
            </button>
          </div>

          {managingSplit ? (
            <SplitManager days={splitDays} onChange={handleSplitChange} />
          ) : splitDays.length > 0 ? (
            <div className="space-y-1.5">
              {splitDays.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSplitDaySelect(day)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    selectedSplitDay === day
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}>
                  <span className={`text-xs font-bold w-12 shrink-0 ${
                    selectedSplitDay === day ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>Day {idx + 1}</span>
                  <span className="text-sm font-semibold">{day}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setManagingSplit(true)}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Set up your split
            </button>
          )}
        </div>

        {/* Day selector */}
        {splitDays.length > 0 && !managingSplit && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Day</p>
            <Select value={selectedSplitDay} onValueChange={handleSplitDaySelect}>
              <SelectTrigger className="w-full h-12 bg-secondary border-0 rounded-2xl text-sm font-semibold">
                <SelectValue placeholder="Pick a day from your split" />
              </SelectTrigger>
              <SelectContent>
                {splitDays.map((day, idx) => (
                  <SelectItem key={idx} value={day}>
                    <span className="text-muted-foreground mr-2 text-xs">Day {idx + 1}</span>{day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button className="w-full h-14 rounded-2xl text-base font-black gap-3 shadow-xl shadow-primary/30"
          onClick={beginWorkout}>
          <Dumbbell className="w-5 h-5" /> Start Workout
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 mr-3">
          <Input value={name} onChange={(e) => setName(e.target.value)}
            className="text-xl font-black bg-transparent border-0 p-0 h-auto text-foreground focus-visible:ring-0" />
        </div>
        <div className="text-right">
          <p className="text-lg font-black tabular-nums text-primary">{fmt(elapsed)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-auto bg-secondary border-0 rounded-full h-8 text-xs font-semibold gap-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" className="rounded-full gap-1 h-8" onClick={() => setTimerOpen(true)}>
          <Timer className="w-3.5 h-3.5" /> Rest
        </Button>
      </div>

      <div className="space-y-4 mb-6">
        {exercises.map((ex, idx) => (
          <ExerciseBlock key={idx} exercise={ex}
            onUpdate={(data) => updateExercise(idx, data)}
            onRemove={() => removeExercise(idx)}
            previousWorkouts={previousWorkouts} />
        ))}
      </div>

      <div className="space-y-3">
        <Button variant="outline" className="w-full h-12 rounded-2xl border-dashed gap-2 text-muted-foreground hover:text-primary hover:border-primary"
          onClick={() => setSelectorOpen(true)}>
          <Plus className="w-5 h-5" /> Add Exercise
        </Button>

        {!creatingExercise ? (
          <Button variant="outline" className="w-full h-12 rounded-2xl border-dashed gap-2 text-muted-foreground hover:text-primary hover:border-primary"
            onClick={() => setCreatingExercise(true)}>
            <Dumbbell className="w-5 h-5" /> Create New Exercise
          </Button>
        ) : (
          <div className="bg-secondary rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-foreground">New Exercise</p>
            <Input value={newExName} onChange={(e) => setNewExName(e.target.value)} placeholder="Exercise name" className="bg-card border-0" autoFocus />
            <div className="flex gap-2">
              <select value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value)}
                className="flex-1 h-9 rounded-md bg-card text-foreground text-sm px-2 border-0 outline-none">
                {MUSCLES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={newExEquipment} onChange={(e) => setNewExEquipment(e.target.value)}
                className="flex-1 h-9 rounded-md bg-card text-foreground text-sm px-2 border-0 outline-none">
                {EQUIPMENTS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setCreatingExercise(false)}>Cancel</Button>
              <Button className="flex-1" onClick={createAndAddExercise} disabled={!newExName.trim()}>Add &amp; Start</Button>
            </div>
          </div>
        )}

        <Button className="w-full h-12 rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20"
            onClick={finishWorkout} disabled={saving}>
            <Check className="w-5 h-5" /> {saving ? "Saving..." : "Finish Workout"}
          </Button>
        <Button variant="ghost" className="w-full h-10 rounded-2xl gap-2 text-muted-foreground hover:text-destructive"
            onClick={cancelWorkout}>
            <X className="w-4 h-4" /> Cancel Workout
          </Button>
      </div>

      <ExerciseSelector open={selectorOpen} onClose={() => setSelectorOpen(false)} onSelect={addExercise} />
      {timerOpen && <RestTimer onClose={() => setTimerOpen(false)} />}
    </div>
  );
}
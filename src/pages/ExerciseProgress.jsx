import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Trophy, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

const GROUPS = ["All", "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Full Body"];

function calcE1RM(weight, reps) {
  return Math.round(weight * (1 + reps / 30));
}

export default function ExerciseProgress() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    base44.entities.Workout.filter({ status: "completed" }, "-started_at", 200)
      .then((w) => {
        setWorkouts(w.filter((x) => !(x.tags?.includes("rest") || x.name === "Rest Day")));
        setLoading(false);
      });
  }, []);

  // Build exercise map (sessions in chronological order for chart)
  const exerciseMap = {};
  [...workouts].reverse().forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      if (!ex.exercise_name) return;
      const top = ex.sets?.filter((s) => !s.is_warmup).reduce((best, s) => {
        if (!best) return s;
        if (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) return s;
        return best;
      }, null);
      if (!top || !top.weight) return;
      if (!exerciseMap[ex.exercise_name]) exerciseMap[ex.exercise_name] = { sessions: [], muscle_group: ex.muscle_group };
      exerciseMap[ex.exercise_name].sessions.push({
        date: w.started_at,
        weight: top.weight,
        reps: top.reps,
        e1rm: calcE1RM(top.weight, top.reps),
      });
    });
  });

  const allExercises = Object.entries(exerciseMap).map(([name, data]) => ({
    name,
    muscle_group: data.muscle_group,
    sessions: data.sessions,
    best: data.sessions.reduce((b, s) => (!b || s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps)) ? s : b, null),
  })).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = allExercises.filter((e) => {
    if (filter !== "All" && e.muscle_group !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = (name) => setExpanded((p) => ({ ...p, [name]: !p[name] }));

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">Top sets and PRs per exercise</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exercise..." className="pl-9 bg-card border-border" />
      </div>

      {/* Muscle group filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {GROUPS.map((g) => (
          <Badge key={g} variant={filter === g ? "default" : "secondary"} className="cursor-pointer shrink-0 rounded-full"
            onClick={() => setFilter(g)}>{g}</Badge>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No data yet</p>
          <p className="text-sm">Complete workouts to track your progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ name, muscle_group, sessions, best }) => {
            const isOpen = expanded[name];
            const last = sessions[sessions.length - 1];
            const prev = sessions[sessions.length - 2];
            const trend = prev ? last?.weight - prev?.weight : null;
            const chartData = sessions.map((s) => ({ date: moment(s.date).format("MMM D"), weight: s.weight }));

            return (
              <div key={name} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => toggle(name)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{muscle_group} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-accent" />
                        <span className="text-sm font-black text-foreground">{best?.weight} x {best?.reps}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-0.5">
                        {trend !== null && (
                          <span className={`text-xs font-semibold ${trend > 0 ? "text-green-400" : trend < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {trend > 0 ? "+" : ""}{trend} lb
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">e1RM {best?.e1rm}</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    {/* Progression chart */}
                    {chartData.length >= 2 && (
                      <div className="px-4 pt-4 pb-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Weight Progression</p>
                        <ResponsiveContainer width="100%" height={100}>
                          <LineChart data={chartData}>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                              formatter={(v) => [`${v} lb`, "Weight"]}
                            />
                            <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Session history — newest first */}
                    <div className="divide-y divide-border">
                      {[...sessions].reverse().map((s, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <Trophy className="w-3.5 h-3.5 text-accent shrink-0" />}
                            <span className="text-sm font-bold text-foreground">{s.weight} lb x {s.reps}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{moment(s.date).format("MMM D, YYYY")}</p>
                            <p className="text-[10px] text-muted-foreground">e1RM {s.e1rm} lb</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import moment from "moment";

function getTopSet(exerciseData) {
  if (!exerciseData?.sets?.length) return null;
  let top = null;
  exerciseData.sets.forEach((s) => {
    if (s.is_warmup) return;
    if (!top || s.weight > top.weight || (s.weight === top.weight && s.reps > top.reps)) {
      top = s;
    }
  });
  return top;
}

export default function PreviousPerformance({ exerciseName, workouts = [] }) {
  const relevant = workouts
    .filter((w) => w.status === "completed" && w.exercises?.some((e) => e.exercise_name === exerciseName))
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 3);

  if (relevant.length === 0) {
    return (
      <div className="px-4 pb-3">
        <p className="text-xs text-muted-foreground italic">No previous data — let's set a baseline!</p>
      </div>
    );
  }

  const sessions = relevant.map((w) => {
    const ex = w.exercises.find((e) => e.exercise_name === exerciseName);
    const top = getTopSet(ex);
    const vol = ex?.sets?.reduce((s, set) => s + (set.is_warmup ? 0 : (set.weight || 0) * (set.reps || 0)), 0) || 0;
    return { date: w.started_at, top, volume: vol };
  });

  return (
    <div className="px-4 pb-3 space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Previous Performances</p>
      {sessions.map((s, i) => {
        const trend = i < sessions.length - 1
          ? (s.top?.weight || 0) > (sessions[i + 1].top?.weight || 0) ? "up"
            : (s.top?.weight || 0) < (sessions[i + 1].top?.weight || 0) ? "down" : "same"
          : "same";
        return (
          <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-accent" />
              <span className="text-sm font-bold text-foreground">
                {s.top ? `${s.top.weight} × ${s.top.reps}` : "—"}
              </span>
              {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-green-400" />}
              {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
              {trend === "same" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{moment(s.date).fromNow()}</p>
              <p className="text-[10px] text-muted-foreground">{s.volume.toLocaleString()} lb vol</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
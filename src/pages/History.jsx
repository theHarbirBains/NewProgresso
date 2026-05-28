import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Calendar, Clock, Dumbbell, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Workout.filter({ status: "completed" }, "-started_at", 100).then((w) => {
      setWorkouts(w);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = {};
  workouts.forEach((w) => {
    const key = moment(w.started_at).format("MMMM YYYY");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <h1 className="text-2xl font-black text-foreground tracking-tight mb-6">History</h1>

      {workouts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No workout history yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, wks]) => (
          <div key={month} className="mb-6">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">{month}</h2>
            <div className="space-y-2">
              {wks.map((w) => (
                <Link key={w.id} to={`/workout/${w.id}`}
                  className="block bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground">{w.name}</h3>
                      <Badge variant="secondary" className="text-[10px] rounded-full">{w.category}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{moment(w.started_at).format("MMM D, YYYY")}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" /> {w.exercises?.length || 0}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round((w.duration_seconds || 0) / 60)}m</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {(w.total_volume || 0).toLocaleString()} lb</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
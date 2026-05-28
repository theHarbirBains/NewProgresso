import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Dumbbell, Flame, Clock, Trophy, TrendingUp, Zap, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function Dashboard() {
  const [workouts, setWorkouts] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Workout.filter({ status: "completed" }, "-started_at", 100),
      base44.entities.PersonalRecord.list("-created_date", 10),
    ]).then(([w, p]) => {
      setWorkouts(w.filter((x) => !(x.tags?.includes("rest") || x.name === "Rest Day")));
      setPrs(p);
      setLoading(false);
    });
  }, []);

  const totalVolume = workouts.reduce((s, w) => s + (w.total_volume || 0), 0);
  const avgDuration = workouts.length > 0 ? Math.round(workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0) / workouts.length / 60) : 0;
  const thisWeek = workouts.filter((w) => moment(w.started_at).isAfter(moment().startOf("week"))).length;

  const recentWorkouts = workouts.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{moment().format("dddd, MMM D")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/workout-calendar">
            <Button variant="secondary" size="icon" className="rounded-full">
              <CalendarDays className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/workout">
            <Button className="rounded-full gap-2 font-bold shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4" /> Start
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: Dumbbell, label: "Workouts", value: workouts.length, color: "text-primary" },
          { icon: Flame, label: "This Week", value: thisWeek, color: "text-accent" },
          { icon: TrendingUp, label: "Total Volume", value: `${(totalVolume / 1000).toFixed(0)}k lb`, color: "text-green-400" },
          { icon: Clock, label: "Avg Duration", value: `${avgDuration}m`, color: "text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-4">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {prs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Recent PRs</h2>
          <div className="space-y-2">
            {prs.slice(0, 3).map((pr) => (
              <div key={pr.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{pr.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">{moment(pr.date).fromNow()}</p>
                </div>
                <p className="text-lg font-black text-accent">{pr.weight} × {pr.reps}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Workouts</h2>
          <Link to="/history" className="text-xs text-primary font-semibold">View All</Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No workouts yet. Start your first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <Link key={w.id} to={`/workout/${w.id}`} className="block bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground">{w.name}</h3>
                  <span className="text-xs text-muted-foreground">{moment(w.started_at).format("MMM D, YYYY")}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{w.exercises?.length || 0} exercises</span>
                  <span>·</span>
                  <span>{Math.round((w.duration_seconds || 0) / 60)}m</span>
                  <span>·</span>
                  <span>{(w.total_volume || 0).toLocaleString()} lb</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
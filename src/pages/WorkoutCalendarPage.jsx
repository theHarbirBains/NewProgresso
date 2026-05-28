import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WorkoutCalendarPage() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment().startOf("month"));
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    base44.entities.Workout.filter({ status: "completed" }, "-started_at", 500).then((data) => {
      setWorkouts(data);
      setLoading(false);
    });
  }, []);

  // Map workouts by date string
  const workoutsByDate = {};
  workouts.forEach((w) => {
    const d = moment(w.started_at).format("YYYY-MM-DD");
    if (!workoutsByDate[d]) workoutsByDate[d] = [];
    workoutsByDate[d].push(w);
  });

  // Build calendar grid
  const startOfMonth = currentMonth.clone().startOf("month");
  const endOfMonth = currentMonth.clone().endOf("month");
  const startDay = startOfMonth.day();
  const daysInMonth = endOfMonth.date();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = moment().format("YYYY-MM-DD");

  const dateStr = (day) => currentMonth.clone().date(day).format("YYYY-MM-DD");
  const selectedWorkouts = selectedDate ? (workoutsByDate[selectedDate] || []) : [];

  // Stats
  const totalWorkouts = workouts.length;
  const thisMonthWorkouts = workouts.filter((w) =>
    moment(w.started_at).isSame(currentMonth, "month")
  ).length;

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Workout Calendar</h1>
        <p className="text-sm text-muted-foreground">{totalWorkouts} total workouts logged</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-black text-primary">{thisMonthWorkouts}</p>
          <p className="text-xs text-muted-foreground mt-0.5">This month</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-2xl font-black text-foreground">{totalWorkouts}</p>
          <p className="text-xs text-muted-foreground mt-0.5">All time</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-2xl border border-border p-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, "month"))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base font-black text-foreground">{currentMonth.format("MMMM YYYY")}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(currentMonth.clone().add(1, "month"))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const ds = dateStr(day);
            const hasWorkout = !!workoutsByDate[ds];
            const isToday = ds === today;
            const isSelected = ds === selectedDate;

            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(isSelected ? null : ds)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all text-xs font-bold ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                    ? "bg-primary/20 text-primary"
                    : hasWorkout
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <span>{day}</span>
                {hasWorkout && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" style={isToday ? {} : {}} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Workout logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary/20 border border-primary/50" />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wide">
            {moment(selectedDate).format("dddd, MMMM D")}
          </h3>
          {selectedWorkouts.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-muted-foreground text-sm">No workout on this day.</p>
            </div>
          ) : (
            selectedWorkouts.map((w) => (
              <Link key={w.id} to={`/workout/${w.id}`}>
                <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((w.duration_seconds || 0) / 60)}m · {(w.exercises || []).length} exercises · {((w.total_volume || 0) / 1000).toFixed(1)}k lb
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
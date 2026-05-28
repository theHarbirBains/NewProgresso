import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function NutritionCalendarPage() {
  const navigate = useNavigate();
  const [allLogs, setAllLogs] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment().startOf("month"));
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MealLog.list("-log_date", 500),
      base44.entities.NutritionGoals.list("-created_date", 1),
    ]).then(([logs, goals]) => {
      setAllLogs(logs);
      if (goals[0]?.calorie_goal) setDailyGoal(goals[0].calorie_goal);
      setLoading(false);
    });
  }, []);

  const logsByDate = {};
  for (const log of allLogs) {
    if (!logsByDate[log.log_date]) logsByDate[log.log_date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    logsByDate[log.log_date].calories += log.total_calories || 0;
    logsByDate[log.log_date].protein += log.total_protein || 0;
    logsByDate[log.log_date].carbs += log.total_carbs || 0;
    logsByDate[log.log_date].fat += log.total_fat || 0;
  }

  const startDay = moment(currentMonth).startOf("month").startOf("week");
  const endDay = moment(currentMonth).endOf("month").endOf("week");
  const days = [];
  let d = moment(startDay);
  while (d.isSameOrBefore(endDay, "day")) { days.push(moment(d)); d.add(1, "day"); }

  const today = moment().format("YYYY-MM-DD");

  const getDotColor = (dateStr) => {
    const data = logsByDate[dateStr];
    if (!data || data.calories === 0) return null;
    const pct = dailyGoal > 0 ? data.calories / dailyGoal : 0;
    if (pct >= 0.9 && pct <= 1.1) return "bg-green-400";
    if (pct < 0.9) return "bg-blue-400";
    return "bg-orange-400";
  };

  const selectedData = selectedDay ? logsByDate[selectedDay] : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-2xl font-black text-foreground">Eating History</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(moment(currentMonth).subtract(1, "month"))}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <p className="text-lg font-black text-foreground">{currentMonth.format("MMMM YYYY")}</p>
        <button onClick={() => setCurrentMonth(moment(currentMonth).add(1, "month"))}
          disabled={currentMonth.isSameOrAfter(moment().startOf("month"))}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors disabled:opacity-30">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <p key={w} className="text-[10px] font-bold text-muted-foreground py-1">{w}</p>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = day.format("YYYY-MM-DD");
          const isCurrentMonth = day.isSame(currentMonth, "month");
          const isToday = dateStr === today;
          const isFuture = day.isAfter(moment(), "day");
          const isSelected = dateStr === selectedDay;
          const dotColor = getDotColor(dateStr);

          return (
            <button key={dateStr}
              onClick={() => !isFuture && isCurrentMonth && setSelectedDay(dateStr === selectedDay ? null : dateStr)}
              disabled={isFuture || !isCurrentMonth}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative ${
                isSelected ? "bg-primary ring-2 ring-primary/50" :
                isToday ? "bg-primary/20 ring-1 ring-primary/40" :
                isCurrentMonth && !isFuture ? "bg-secondary hover:bg-secondary/70" : "opacity-20"
              }`}>
              <span className={`text-sm font-bold ${isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-foreground"}`}>
                {day.format("D")}
              </span>
              {dotColor && isCurrentMonth && (
                <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground/70" : dotColor}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center py-1">
        {[
          { color: "bg-blue-400", label: "Under goal" },
          { color: "bg-green-400", label: "On target" },
          { color: "bg-orange-400", label: "Over goal" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] text-muted-foreground font-semibold">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-black text-foreground">{moment(selectedDay).format("dddd, MMM D")}</p>
            <Button size="sm" variant="default" className="rounded-full text-xs h-7"
              onClick={() => navigate(`/nutrition?date=${selectedDay}`)}>
              View Day
            </Button>
          </div>
          {selectedData ? (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Calories", value: Math.round(selectedData.calories), unit: "kcal", color: "text-accent" },
                { label: "Protein", value: Math.round(selectedData.protein), unit: "g", color: "text-blue-400" },
                { label: "Carbs", value: Math.round(selectedData.carbs), unit: "g", color: "text-green-400" },
                { label: "Fat", value: Math.round(selectedData.fat), unit: "g", color: "text-yellow-400" },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-secondary rounded-xl p-2">
                  <p className={`text-base font-black ${color}`}>{value}<span className="text-xs font-normal">{unit}</span></p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">Nothing logged this day.</p>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">All Time</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-xl font-black text-foreground">{Object.keys(logsByDate).length}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Days Logged</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-xl font-black text-foreground">
              {Math.round(Object.values(logsByDate).reduce((s, d) => s + d.calories, 0) / 1000)}k
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Total kcal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
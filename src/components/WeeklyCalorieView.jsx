import moment from "moment";

function getWeeks(count = 6) {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const start = moment().subtract(i, "weeks").startOf("week");
    const end = moment().subtract(i, "weeks").endOf("week");
    weeks.push({ start, end, label: i === 0 ? "This Week" : i === 1 ? "Last Week" : start.format("MMM D") + " – " + end.format("MMM D") });
  }
  return weeks;
}

function getDaysOfWeek(weekStart) {
  return Array.from({ length: 7 }, (_, i) => moment(weekStart).add(i, "days"));
}

export default function WeeklyCalorieView({ allLogs, dailyGoal }) {
  const weeklyGoal = dailyGoal * 7;
  const weeks = getWeeks(6);

  // Group logs by date
  const logsByDate = {};
  for (const log of allLogs) {
    if (!logsByDate[log.log_date]) logsByDate[log.log_date] = 0;
    logsByDate[log.log_date] += log.total_calories || 0;
  }

  const weekData = weeks.map(({ start, end, label }) => {
    const days = getDaysOfWeek(start);
    const dayTotals = days.map((d) => ({
      date: d.format("YYYY-MM-DD"),
      label: d.format("ddd"),
      dayNum: d.format("D"),
      calories: Math.round(logsByDate[d.format("YYYY-MM-DD")] || 0),
      isToday: d.isSame(moment(), "day"),
      isFuture: d.isAfter(moment(), "day"),
    }));
    const total = dayTotals.reduce((s, d) => s + d.calories, 0);
    const pct = weeklyGoal > 0 ? Math.min((total / weeklyGoal) * 100, 100) : 0;
    return { label, start, total, pct, dayTotals };
  });

  const thisWeek = weekData[0];
  const maxDayGoal = dailyGoal || 1;

  return (
    <div className="space-y-4">
      {/* This week hero card */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">This Week</p>
            <p className="text-2xl font-black text-foreground mt-0.5">
              {thisWeek.total.toLocaleString()}
              <span className="text-sm font-semibold text-muted-foreground ml-1">kcal</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Weekly Goal</p>
            <p className="text-lg font-black text-primary">{weeklyGoal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{dailyGoal.toLocaleString()} × 7</p>
          </div>
        </div>

        {/* Weekly progress bar */}
        <div className="space-y-1.5">
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 bg-primary"
              style={{ width: `${thisWeek.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(thisWeek.pct)}% of weekly goal</span>
            <span>{Math.max(0, weeklyGoal - thisWeek.total).toLocaleString()} kcal remaining</span>
          </div>
        </div>

        {/* Day-by-day bars */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {thisWeek.dayTotals.map((day) => {
            const dayPct = maxDayGoal > 0 ? Math.min((day.calories / maxDayGoal) * 100, 100) : 0;
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <p className="text-[10px] text-muted-foreground font-semibold">{day.label}</p>
                <div className="w-full h-16 bg-secondary rounded-lg overflow-hidden flex flex-col justify-end">
                  {!day.isFuture && day.calories > 0 && (
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${day.isToday ? "bg-primary" : "bg-primary/50"}`}
                      style={{ height: `${Math.max(dayPct, 6)}%` }}
                    />
                  )}
                </div>
                <p className={`text-[9px] font-bold ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day.isFuture ? "—" : day.calories > 0 ? `${(day.calories / 1000).toFixed(1)}k` : "0"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past weeks */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">Past Weeks</p>
        {weekData.slice(1).map(({ label, total, pct, start }) => (
          <div key={start.toString()} className="bg-card rounded-2xl border border-border px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground">{label}</p>
              <div className="text-right">
                <span className="text-sm font-black text-foreground">{total.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1">/ {weeklyGoal.toLocaleString()} kcal</span>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{Math.round(pct)}% of goal</p>
          </div>
        ))}
      </div>
    </div>
  );
}
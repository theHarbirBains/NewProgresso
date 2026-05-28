import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LayoutDashboard, Dumbbell, Clock, Library, TrendingUp, Salad, BookOpen, CalendarDays } from "lucide-react";

const FITNESS_NAV = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/history", icon: Clock, label: "History" },
  { path: "/workout", icon: Dumbbell, label: "Workout", isMain: true },
  { path: "/exercises", icon: Library, label: "Exercises" },
  { path: "/progress", icon: TrendingUp, label: "Progress" },
];

const NUTRITION_NAV = [
  { path: "/nutrition", icon: Salad, label: "Nutrition", isMain: true },
  { path: "/nutrition/library", icon: BookOpen, label: "Library" },
  { path: "/nutrition/calendar", icon: CalendarDays, label: "Calendar" },
];



export default function Layout() {
  const navigate = useNavigate();
  const [workoutActive, setWorkoutActive] = useState(false);
  const [nutritionMode, setNutritionMode] = useState(() => localStorage.getItem("appMode") === "nutrition");

  useEffect(() => {
    const stored = localStorage.getItem("appMode");
    if (stored === "nutrition") navigate("/nutrition");
    else navigate("/");
  }, []);
  const [fading, setFading] = useState(false);

  const toggleMode = () => {
    const next = !nutritionMode;
    setFading(true);
    setTimeout(() => {
      setNutritionMode(next);
      localStorage.setItem("appMode", next ? "nutrition" : "fitness");
      navigate(next ? "/nutrition" : "/");
      setTimeout(() => setFading(false), 50);
    }, 220);
  };

  const NAV_ITEMS = nutritionMode ? NUTRITION_NAV : FITNESS_NAV;

  useEffect(() => {
    const check = () => setWorkoutActive(!!localStorage.getItem("activeWorkout"));
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background font-inter flex flex-col">
      {/* Mode toggle — sticky top bar, part of document flow */}
      <header className="sticky top-0 z-40 flex justify-end items-center px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border/30">
        <button
          onClick={toggleMode}
          className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-sm transition-all duration-300 hover:border-primary/40"
        >
          <div
            className="relative w-9 h-5 rounded-full transition-colors duration-300"
            style={{ background: nutritionMode ? "hsl(var(--chart-3))" : "hsl(var(--primary))" }}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${nutritionMode ? "left-4" : "left-0.5"}`} />
          </div>
          <span className="text-xs font-bold text-foreground">
            {nutritionMode ? "🥗 Nutrition" : "💪 Fitness"}
          </span>
        </button>
      </header>
      <main
        className="flex-1 pb-24 overflow-y-auto"
        style={{
          opacity: fading ? 0 : 1,
          transform: fading ? "scale(0.98)" : "scale(1)",
          transition: "opacity 220ms ease, transform 220ms ease",
        }}
      >
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            if (item.isMain) {
              return (
                <NavLink key={item.path} to={item.path} className="relative -mt-6">
                  {({ isActive }) => (
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 relative ${isActive ? "bg-primary shadow-lg shadow-primary/30" : "bg-secondary"}`}>
                      <item.icon className="w-6 h-6 text-primary-foreground" />
                      {workoutActive && !isActive && !nutritionMode && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                      )}
                    </div>
                  )}
                </NavLink>
              );
            }
            return (
              <NavLink key={item.path} to={item.path} className="flex flex-col items-center gap-1 py-1 px-3">
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
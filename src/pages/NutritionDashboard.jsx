import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Settings, Trash2, ChevronRight, Flame, Utensils, BarChart2, Share2 } from "lucide-react";
import MacroShareCard from "../components/MacroShareCard";
import { Button } from "@/components/ui/button";
import MacroBar from "../components/MacroBar";
import AddFoodModal from "../components/AddFoodModal";
import WeeklyCalorieView from "../components/WeeklyCalorieView";
import moment from "moment";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks", "Custom"];
const TODAY = moment().format("YYYY-MM-DD");

export default function NutritionDashboard() {
  const [goals, setGoals] = useState(null);
  const [mealLogs, setMealLogs] = useState([]);
  const [savedFoods, setSavedFoods] = useState([]);
  const [addingTo, setAddingTo] = useState(null); // meal category string
  const [pickingMeal, setPickingMeal] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalForm, setGoalForm] = useState({ calorie_goal: 2000, protein_goal: 150, carb_goal: 200, fat_goal: 65 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [allLogs, setAllLogs] = useState([]);
  const [showWeekly, setShowWeekly] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam) setSelectedDate(dateParam);
  }, []);

  const fetchData = async () => {
    const sixWeeksAgo = moment().subtract(6, "weeks").startOf("isoWeek").format("YYYY-MM-DD");
    const [g, logs, foods, weeklyLogs] = await Promise.all([
      base44.entities.NutritionGoals.list("-created_date", 1),
      base44.entities.MealLog.filter({ log_date: selectedDate }, "-created_date", 20),
      base44.entities.FoodItem.list("-created_date", 100),
      base44.entities.MealLog.list("-log_date", 500),
    ]);
    setGoals(g[0] || null);
    if (g[0]) setGoalForm({ calorie_goal: g[0].calorie_goal, protein_goal: g[0].protein_goal, carb_goal: g[0].carb_goal, fat_goal: g[0].fat_goal });
    setMealLogs(logs);
    setSavedFoods(foods);
    setAllLogs(weeklyLogs.filter((l) => l.log_date >= sixWeeksAgo));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [selectedDate]);

  // Totals
  const totals = mealLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.total_calories || 0),
    protein: acc.protein + (log.total_protein || 0),
    carbs: acc.carbs + (log.total_carbs || 0),
    fat: acc.fat + (log.total_fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const g = goals || goalForm;
  const remaining = Math.max(0, g.calorie_goal - totals.calories);

  const handleAddFood = async (mealCategory, foodEntry) => {
    const existing = mealLogs.find((m) => m.meal_category === mealCategory);
    const newFoods = [...(existing?.foods || []), foodEntry];
    const newTotals = newFoods.reduce((acc, f) => ({
      total_calories: acc.total_calories + (f.calories || 0),
      total_protein: acc.total_protein + (f.protein || 0),
      total_carbs: acc.total_carbs + (f.carbs || 0),
      total_fat: acc.total_fat + (f.fat || 0),
    }), { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 });

    if (existing) {
      const updated = await base44.entities.MealLog.update(existing.id, { foods: newFoods, ...newTotals });
      setMealLogs((prev) => prev.map((m) => m.id === existing.id ? updated : m));
    } else {
      const created = await base44.entities.MealLog.create({
        log_date: selectedDate, meal_category: mealCategory,
        foods: newFoods, ...newTotals,
      });
      setMealLogs((prev) => [...prev, created]);
    }
  };

  const handleRemoveFood = async (logId, foodIdx) => {
    const log = mealLogs.find((m) => m.id === logId);
    const newFoods = log.foods.filter((_, i) => i !== foodIdx);
    const newTotals = newFoods.reduce((acc, f) => ({
      total_calories: acc.total_calories + (f.calories || 0),
      total_protein: acc.total_protein + (f.protein || 0),
      total_carbs: acc.total_carbs + (f.carbs || 0),
      total_fat: acc.total_fat + (f.fat || 0),
    }), { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 });
    const updated = await base44.entities.MealLog.update(logId, { foods: newFoods, ...newTotals });
    setMealLogs((prev) => prev.map((m) => m.id === logId ? updated : m));
  };

  const saveGoals = async () => {
    const data = { calorie_goal: Number(goalForm.calorie_goal), protein_goal: Number(goalForm.protein_goal), carb_goal: Number(goalForm.carb_goal), fat_goal: Number(goalForm.fat_goal) };
    if (goals) {
      const updated = await base44.entities.NutritionGoals.update(goals.id, data);
      setGoals(updated);
    } else {
      const created = await base44.entities.NutritionGoals.create(data);
      setGoals(created);
    }
    setEditingGoals(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Nutrition</h1>
          <p className="text-sm text-muted-foreground">{moment(selectedDate).format("dddd, MMM D")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" className="rounded-full" onClick={() => setShowShare(true)} title="Share macros">
            <Share2 className="w-4 h-4" />
          </Button>
          <Link to="/nutrition/library">
            <Button variant="secondary" size="sm" className="rounded-full text-xs gap-1">Library <ChevronRight className="w-3 h-3" /></Button>
          </Link>
          <Button variant="secondary" size="icon" className="rounded-full" onClick={() => setEditingGoals(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Date navigation — Sun to Sat of current week */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {Array.from({ length: 7 }, (_, i) => {
          const d = moment().startOf("week").add(i, "days").format("YYYY-MM-DD");
          const isSelected = d === selectedDate;
          const isToday = d === TODAY;
          return (
            <button key={d} onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl shrink-0 transition-all ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              <span className="text-[10px] font-bold">{moment(d).format("ddd")}</span>
              <span className="text-sm font-black">{moment(d).format("D")}</span>
              {isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Quick add button */}
      <button
        onClick={() => setPickingMeal(true)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
      >
        <Plus className="w-5 h-5" /> Log Food
      </button>

      {/* Weekly progress bar — always visible */}
      {(() => {
        const weekStart = moment().startOf("week").format("YYYY-MM-DD");
        const weekEnd = moment().endOf("week").format("YYYY-MM-DD");
        const weekConsumed = allLogs
          .filter((l) => l.log_date >= weekStart && l.log_date <= weekEnd)
          .reduce((s, l) => s + (l.total_calories || 0), 0);
        const weeklyGoal = g.calorie_goal * 7;
        const pct = weeklyGoal > 0 ? Math.min((weekConsumed / weeklyGoal) * 100, 100) : 0;
        return (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">This Week</p>
              <p className="text-xs font-bold text-foreground">
                {Math.round(weekConsumed).toLocaleString()} <span className="text-muted-foreground font-normal">/ {weeklyGoal.toLocaleString()} kcal</span>
              </p>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{moment().startOf("week").format("MMM D")} – {moment().endOf("week").format("MMM D")}</span>
              <span>{Math.round(pct)}% of weekly goal</span>
            </div>
          </div>
        );
      })()}

      {/* Weekly toggle button */}
      <button
        onClick={() => setShowWeekly((v) => !v)}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-2xl bg-secondary text-foreground/80 font-bold text-sm hover:bg-secondary/70 transition-all active:scale-95"
      >
        <BarChart2 className="w-4 h-4 text-primary" />
        {showWeekly ? "Hide Weekly View" : "View Weekly Calories"}
      </button>

      {/* Weekly calories view */}
      {showWeekly && (
        <WeeklyCalorieView allLogs={allLogs} dailyGoal={g.calorie_goal} />
      )}

      {/* Calorie summary */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
            <p className="text-3xl font-black text-foreground">{Math.round(totals.calories)}</p>
            <p className="text-xs text-muted-foreground">consumed</p>
          </div>
          <div className="flex flex-col items-center px-4">
            <Flame className="w-6 h-6 text-accent mb-1" />
            <p className="text-xs text-muted-foreground">goal {g.calorie_goal}</p>
          </div>
          <div className="text-center flex-1">
            <p className={`text-3xl font-black ${remaining === 0 ? "text-destructive" : "text-green-400"}`}>{remaining}</p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          <MacroBar label="Protein" consumed={totals.protein} goal={g.protein_goal} color="bg-blue-400" />
          <MacroBar label="Carbs" consumed={totals.carbs} goal={g.carb_goal} color="bg-green-400" />
          <MacroBar label="Fat" consumed={totals.fat} goal={g.fat_goal} color="bg-yellow-400" />
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-3">
        {MEALS.map((meal) => {
          const log = mealLogs.find((m) => m.meal_category === meal);
          const mealCals = log?.total_calories || 0;
          return (
            <div key={meal} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-bold text-foreground text-sm">{meal}</p>
                  {mealCals > 0 && <p className="text-xs text-muted-foreground">{Math.round(mealCals)} kcal</p>}
                </div>
                <Button size="sm" variant="ghost" className="gap-1 text-primary h-8"
                  onClick={() => setAddingTo(meal)}>
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
              {log?.foods?.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {log.foods.map((food, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{food.name}</p>
                        <p className="text-xs text-muted-foreground">{food.quantity} {food.serving_unit} · P {food.protein}g · C {food.carbs}g · F {food.fat}g</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-foreground">{Math.round(food.calories)}</span>
                        <button onClick={() => handleRemoveFood(log.id, idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Goals modal */}
      {editingGoals && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end">
          <div className="bg-card border-t border-border rounded-t-3xl w-full flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="shrink-0 p-6 pb-3">
              <h3 className="text-lg font-black text-foreground">Daily Goals</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-2">
              {[
                { key: "calorie_goal", label: "Calories (kcal)" },
                { key: "protein_goal", label: "Protein (g)" },
                { key: "carb_goal", label: "Carbs (g)" },
                { key: "fat_goal", label: "Fat (g)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <input type="number" value={goalForm[key]}
                    onChange={(e) => setGoalForm({ ...goalForm, [key]: e.target.value })}
                    className="w-full h-10 rounded-xl bg-secondary text-foreground text-sm px-3 border-0 outline-none" />
                </div>
              ))}
            </div>
            <div className="shrink-0 p-6 pt-3 space-y-2">
              <Button className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20" onClick={saveGoals}>Save Goals</Button>
              <Button variant="ghost" className="w-full h-10 text-muted-foreground" onClick={() => setEditingGoals(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Meal picker */}
      {pickingMeal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setPickingMeal(false)}>
          <div className="bg-card border border-border rounded-3xl w-full max-w-sm p-5 space-y-3 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-1">
              <Utensils className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-black text-foreground">Add to which meal?</h3>
            </div>
            {MEALS.map((meal) => {
              const log = mealLogs.find((m) => m.meal_category === meal);
              const cals = log?.total_calories || 0;
              return (
                <button key={meal} onClick={() => { setPickingMeal(false); setAddingTo(meal); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-secondary hover:bg-secondary/70 transition-all active:scale-98">
                  <span className="font-bold text-foreground">{meal}</span>
                  {cals > 0 && <span className="text-xs text-muted-foreground">{Math.round(cals)} kcal logged</span>}
                </button>
              );
            })}
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setPickingMeal(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Share card */}
      {showShare && (
        <MacroShareCard
          date={selectedDate}
          totals={totals}
          goals={goals || goalForm}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Add food modal */}
      <AddFoodModal
        open={!!addingTo}
        onClose={() => setAddingTo(null)}
        onAdd={(food) => handleAddFood(addingTo, food)}
        recentFoods={savedFoods}
      />
    </div>
  );
}
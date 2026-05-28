import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Plus, Trash2, Search, Edit2, Check, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const UNITS = ["g", "ml", "oz", "scoop", "cup", "piece", "tbsp", "tsp", "slice", "serving"];
const EMPTY = { name: "", calories_per_serving: "", protein_per_serving: "", carbs_per_serving: "", fat_per_serving: "", serving_size: 1, serving_unit: "g" };

function groupAlphabetically(foods) {
  const sorted = [...foods].sort((a, b) => a.name.localeCompare(b.name));
  const groups = {};
  for (const food of sorted) {
    const letter = (food.name[0] || "#").toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(food);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function FoodLibrary() {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogFood, setDialogFood] = useState(null); // null = closed, {} = new, food obj = edit
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    base44.entities.FoodItem.list("-is_favorite", 200).then(setFoods);
  }, []);

  const openCreate = () => { setForm(EMPTY); setDialogFood({}); };
  const openEdit = (food) => {
    setForm({ name: food.name, calories_per_serving: food.calories_per_serving, protein_per_serving: food.protein_per_serving, carbs_per_serving: food.carbs_per_serving, fat_per_serving: food.fat_per_serving, serving_size: food.serving_size || 1, serving_unit: food.serving_unit || "g" });
    setDialogFood(food);
  };

  const handleSave = async () => {
    if (!form.name || !form.calories_per_serving) return;
    const data = { ...form, calories_per_serving: Number(form.calories_per_serving), protein_per_serving: Number(form.protein_per_serving) || 0, carbs_per_serving: Number(form.carbs_per_serving) || 0, fat_per_serving: Number(form.fat_per_serving) || 0, serving_size: Number(form.serving_size) || 1 };
    if (dialogFood?.id) {
      const updated = await base44.entities.FoodItem.update(dialogFood.id, data);
      setFoods((prev) => prev.map((f) => f.id === dialogFood.id ? updated : f));
    } else {
      const created = await base44.entities.FoodItem.create({ ...data, is_favorite: false });
      setFoods((prev) => [created, ...prev]);
    }
    setDialogFood(null);
  };

  const toggleFav = async (food) => {
    const updated = await base44.entities.FoodItem.update(food.id, { is_favorite: !food.is_favorite });
    setFoods((prev) => prev.map((f) => f.id === food.id ? updated : f));
  };

  const deleteFood = async (id) => {
    await base44.entities.FoodItem.delete(id);
    setFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const duplicate = async (food) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = food;
    const created = await base44.entities.FoodItem.create({ ...rest, name: food.name + " (copy)" });
    setFoods((prev) => [created, ...prev]);
  };

  const filtered = foods.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const favorites = filtered.filter((f) => f.is_favorite);
  const nonFavorites = filtered.filter((f) => !f.is_favorite);
  const groups = groupAlphabetically(nonFavorites);

  return (
    <div className="max-w-lg mx-auto pb-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-6 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-foreground">Food Library</h1>
          <Button size="sm" className="rounded-full gap-1" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search foods..." className="pl-9 bg-secondary border-0" />
        </div>
      </div>

      {/* Alphabetical list */}
      <div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-16">No foods saved yet. Add your first one!</p>
        )}
        {favorites.length > 0 && (
          <div>
            <div className="sticky top-[116px] px-4 py-1.5 bg-secondary/80 backdrop-blur-sm z-[5]">
              <span className="text-xs font-black text-accent tracking-wide">★ Favorites</span>
            </div>
            {favorites.map((food) => (
              <button key={food.id} onClick={() => openEdit(food)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/40 active:bg-secondary transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-accent">{food.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">{food.serving_size} {food.serving_unit} · {food.calories_per_serving} kcal · P{food.protein_per_serving}g · C{food.carbs_per_serving}g · F{food.fat_per_serving}g</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFav(food); }} className="p-2">
                  <Star className="w-4 h-4 text-accent fill-accent" />
                </button>
              </button>
            ))}
          </div>
        )}
        {groups.map(([letter, items]) => (
          <div key={letter}>
            <div className="sticky top-[116px] px-4 py-1.5 bg-secondary/80 backdrop-blur-sm z-[5]">
              <span className="text-xs font-black text-muted-foreground tracking-wide">{letter}</span>
            </div>
            {items.map((food) => (
              <button key={food.id} onClick={() => openEdit(food)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/40 active:bg-secondary transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-primary">{food.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">{food.serving_size} {food.serving_unit} · {food.calories_per_serving} kcal · P{food.protein_per_serving}g · C{food.carbs_per_serving}g · F{food.fat_per_serving}g</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(food); }} className="p-2">
                    <Star className={`w-4 h-4 ${food.is_favorite ? "text-accent fill-accent" : "text-muted-foreground"}`} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Edit / Create modal */}
      {dialogFood !== null && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end" onClick={() => setDialogFood(null)}>
          <div className="bg-card border-t border-border rounded-t-3xl w-full overflow-y-auto p-5 space-y-3" style={{ height: '82vh' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground">{dialogFood?.id ? "Edit Food" : "New Food"}</h3>
              <div className="flex gap-2">
                {dialogFood?.id && (
                  <>
                    <button onClick={() => { duplicate(dialogFood); setDialogFood(null); }} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => { deleteFood(dialogFood.id); setDialogFood(null); }} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button onClick={() => setDialogFood(null)} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Food name" className="bg-secondary border-0" autoFocus />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Serving size</p>
                <Input type="number" value={form.serving_size} onChange={(e) => setForm({ ...form, serving_size: e.target.value })} className="bg-secondary border-0" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Unit</p>
                <select value={form.serving_unit} onChange={(e) => setForm({ ...form, serving_unit: e.target.value })}
                  className="w-full h-9 rounded-md bg-secondary text-foreground text-sm px-2 border-0 outline-none">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[["calories_per_serving", "Calories (kcal)"], ["protein_per_serving", "Protein (g)"], ["carbs_per_serving", "Carbs (g)"], ["fat_per_serving", "Fat (g)"]].map(([key, label]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <Input type="number" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="bg-secondary border-0" />
                </div>
              ))}
            </div>

            <Button className="w-full h-12 font-bold rounded-2xl" onClick={handleSave} disabled={!form.name || !form.calories_per_serving}>
              <Check className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
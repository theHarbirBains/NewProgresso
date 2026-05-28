import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Sparkles, Camera, PenLine, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_FORM = { name: "", calories: "", protein: "", carbs: "", fat: "", quantity: 100, serving_size: 100, serving_unit: "g" };
const UNITS = ["g", "ml", "oz", "scoop", "cup", "piece", "tbsp", "tsp", "slice", "serving"];

function groupAlphabetically(foods) {
  const sorted = [...foods].sort((a, b) => a.name.localeCompare(b.name));
  const groups = {};
  for (const food of sorted) {
    const letter = food.name[0]?.toUpperCase() || "#";
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(food);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function AddFoodModal({ open, onClose, onAdd, recentFoods = [] }) {
  const [tab, setTab] = useState("library");
  const [customMode, setCustomMode] = useState("manual");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedQty, setSelectedQty] = useState("");
  const fileRef = useRef(null);

  if (!open) return null;

  const resetForm = () => setForm(DEFAULT_FORM);

  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Give me accurate nutrition info for: "${aiPrompt}". Return ONLY JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" }
        }
      }
    });
    setForm({
      name: result.name || aiPrompt,
      calories: result.calories || "",
      protein: result.protein || "",
      carbs: result.carbs || "",
      fat: result.fat || "",
      quantity: 1,
      serving_size: 1,
      serving_unit: "serving"
    });
    setCustomMode("manual");
    setAiLoading(false);
  };

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: "This is a nutrition facts label. Extract the nutritional information per serving. Return ONLY JSON.",
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          serving_size: { type: "number" },
          serving_unit: { type: "string" }
        }
      }
    });
    setForm({
      name: result.name || "Scanned Food",
      calories: result.calories || "",
      protein: result.protein || "",
      carbs: result.carbs || "",
      fat: result.fat || "",
      quantity: result.serving_size || 1,
      serving_size: result.serving_size || 1,
      serving_unit: result.serving_unit || "g"
    });
    setCustomMode("manual");
    setScanLoading(false);
  };

  const handleAdd = async (saveToLibrary = false) => {
    if (!form.name || !form.calories) return;
    setSaving(true);
    const ratio = Number(form.quantity) / (Number(form.serving_size) || 1);
    const scaledCalories = Math.round(Number(form.calories) * ratio);
    const scaledProtein = Math.round(Number(form.protein) * ratio * 10) / 10;
    const scaledCarbs = Math.round(Number(form.carbs) * ratio * 10) / 10;
    const scaledFat = Math.round(Number(form.fat) * ratio * 10) / 10;
    let food_item_id = null;
    if (saveToLibrary) {
      const saved = await base44.entities.FoodItem.create({
        name: form.name,
        calories_per_serving: Number(form.calories),
        protein_per_serving: Number(form.protein) || 0,
        carbs_per_serving: Number(form.carbs) || 0,
        fat_per_serving: Number(form.fat) || 0,
        serving_size: Number(form.serving_size) || 100,
        serving_unit: form.serving_unit,
        is_favorite: false,
      });
      food_item_id = saved.id;
    }
    onAdd({
      food_item_id,
      name: form.name,
      quantity: Number(form.quantity) || 1,
      serving_unit: form.serving_unit,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
    });
    resetForm();
    setSaving(false);
    onClose();
  };

  const selectFood = (food) => {
    setSelectedFood(food);
    setSelectedQty(String(food.serving_size || 1));
  };

  const confirmSelectedFood = () => {
    if (!selectedFood) return;
    const refSize = selectedFood.serving_size || 1;
    const qty = Number(selectedQty) || refSize;
    const ratio = qty / refSize;
    onAdd({
      food_item_id: selectedFood.id,
      name: selectedFood.name,
      quantity: qty,
      serving_unit: selectedFood.serving_unit || "serving",
      calories: Math.round(selectedFood.calories_per_serving * ratio),
      protein: Math.round(selectedFood.protein_per_serving * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbs_per_serving * ratio * 10) / 10,
      fat: Math.round(selectedFood.fat_per_serving * ratio * 10) / 10,
    });
    setSelectedFood(null);
    setSelectedQty("");
    onClose();
  };

  const groups = groupAlphabetically(recentFoods);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => {
          if (selectedFood) { setSelectedFood(null); setSelectedQty(""); }
          else onClose();
        }}>
          <X className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-black text-foreground flex-1">
          {selectedFood ? `How much ${selectedFood.name}?` : "Add Food"}
        </h2>
      </div>

      {/* Quantity prompt — shown when a food is selected */}
      {selectedFood ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="bg-secondary rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-foreground">{selectedFood.name}</p>
            <p className="text-xs text-muted-foreground">
              Per {selectedFood.serving_size} {selectedFood.serving_unit}: {selectedFood.calories_per_serving} kcal ·
              P {selectedFood.protein_per_serving}g · C {selectedFood.carbs_per_serving}g · F {selectedFood.fat_per_serving}g
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount consumed</p>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={selectedQty}
                onChange={(e) => setSelectedQty(e.target.value)}
                className="bg-secondary border-0 w-32 text-lg font-bold"
                autoFocus
              />
              <span className="text-sm font-semibold text-foreground">{selectedFood.serving_unit || "serving"}</span>
            </div>
            {selectedQty && Number(selectedQty) > 0 && (
              <div className="bg-primary/10 rounded-xl p-3">
                <p className="text-sm text-primary font-bold">
                  {Math.round(selectedFood.calories_per_serving * (Number(selectedQty) / (selectedFood.serving_size || 1)))} kcal
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  P {Math.round(selectedFood.protein_per_serving * (Number(selectedQty) / (selectedFood.serving_size || 1)) * 10) / 10}g ·
                  C {Math.round(selectedFood.carbs_per_serving * (Number(selectedQty) / (selectedFood.serving_size || 1)) * 10) / 10}g ·
                  F {Math.round(selectedFood.fat_per_serving * (Number(selectedQty) / (selectedFood.serving_size || 1)) * 10) / 10}g
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setSelectedFood(null); setSelectedQty(""); }}>Back</Button>
            <Button className="flex-1 h-12 font-bold" onClick={confirmSelectedFood} disabled={!selectedQty || Number(selectedQty) <= 0}>
              Add to Meal
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex shrink-0 border-b border-border">
            {[
              { key: "library", label: "My Library" },
              { key: "custom", label: "Custom Entry" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
                  tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Library tab */}
          {tab === "library" && (
            <div className="flex-1 overflow-y-auto">
              {recentFoods.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
                  <p className="text-muted-foreground text-sm">No foods in your library yet.</p>
                  <Button variant="secondary" onClick={() => setTab("custom")}>Add a Custom Food</Button>
                </div>
              ) : (
                <div>
                  {groups.map(([letter, foods]) => (
                    <div key={letter}>
                      <div className="sticky top-0 px-4 py-1 bg-secondary/80 backdrop-blur-sm">
                        <span className="text-xs font-black text-muted-foreground">{letter}</span>
                      </div>
                      {foods.map((food) => (
                        <button key={food.id} onClick={() => selectFood(food)}
                          className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/40 transition-colors text-left active:bg-secondary">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {food.serving_size} {food.serving_unit} · {food.calories_per_serving} kcal · P{food.protein_per_serving}g · C{food.carbs_per_serving}g · F{food.fat_per_serving}g
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom tab */}
          {tab === "custom" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Sub-mode tabs */}
              <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
                {[
                  { key: "manual", icon: PenLine, label: "Manual" },
                  { key: "ai", icon: Sparkles, label: "AI Estimate" },
                  { key: "scan", icon: Camera, label: "Scan Label" },
                ].map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => setCustomMode(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      customMode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              {/* AI mode */}
              {customMode === "ai" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Describe any food and get instant nutrition info.</p>
                  <div className="flex gap-2">
                    <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. 400g chicken breast grilled"
                      className="bg-secondary border-0"
                      onKeyDown={(e) => e.key === "Enter" && handleAI()} />
                    <Button onClick={handleAI} disabled={aiLoading || !aiPrompt.trim()}>
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </Button>
                  </div>
                  {aiLoading && <p className="text-xs text-muted-foreground text-center">Estimating nutrition...</p>}
                </div>
              )}

              {/* Scan mode */}
              {customMode === "scan" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Take a photo of the nutrition facts label.</p>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
                  <Button className="w-full h-14 gap-2" onClick={() => fileRef.current?.click()} disabled={scanLoading}>
                    {scanLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    {scanLoading ? "Scanning label..." : "Open Camera"}
                  </Button>
                </div>
              )}

              {/* Manual mode */}
              {customMode === "manual" && (
                <div className="space-y-3">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Food name" className="bg-secondary border-0" />

                  <div className="bg-secondary/60 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Macros are per</p>
                    <div className="flex gap-2">
                      <Input type="number" value={form.serving_size}
                        onChange={(e) => setForm({ ...form, serving_size: e.target.value })}
                        className="bg-card border-0 w-24" placeholder="100" />
                      <select value={form.serving_unit} onChange={(e) => setForm({ ...form, serving_unit: e.target.value })}
                        className="flex-1 h-9 rounded-md bg-card text-foreground text-sm px-2 border-0 outline-none">
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "calories", label: "Calories (kcal)" },
                      { key: "protein", label: "Protein (g)" },
                      { key: "carbs", label: "Carbs (g)" },
                      { key: "fat", label: "Fat (g)" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1 ml-1">{label}</p>
                        <Input type="number" value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          className="bg-secondary border-0" />
                      </div>
                    ))}
                  </div>

                  <div className="bg-secondary/60 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount I consumed</p>
                    <div className="flex gap-2 items-center">
                      <Input type="number" value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        className="bg-card border-0 w-24" />
                      <span className="text-sm text-muted-foreground">{form.serving_unit}</span>
                    </div>
                    {form.calories && form.serving_size && form.quantity && (
                      <p className="text-xs text-primary font-semibold">
                        ≈ {Math.round(Number(form.calories) * (Number(form.quantity) / Number(form.serving_size)))} kcal
                        · P {Math.round(Number(form.protein || 0) * (Number(form.quantity) / Number(form.serving_size)) * 10) / 10}g
                        · C {Math.round(Number(form.carbs || 0) * (Number(form.quantity) / Number(form.serving_size)) * 10) / 10}g
                        · F {Math.round(Number(form.fat || 0) * (Number(form.quantity) / Number(form.serving_size)) * 10) / 10}g
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="secondary" className="flex-1" onClick={() => handleAdd(false)} disabled={saving || !form.name || !form.calories}>
                      Add Once
                    </Button>
                    <Button className="flex-1" onClick={() => handleAdd(true)} disabled={saving || !form.name || !form.calories}>
                      Add &amp; Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
import { useRef, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import moment from "moment";

export default function MacroShareCard({ date, totals, goals, onClose }) {
  const cardRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const caloriePercent = goals?.calorie_goal > 0 ? Math.min(Math.round((totals.calories / goals.calorie_goal) * 100), 999) : 0;

  const macros = [
    { label: "Protein", value: Math.round(totals.protein), unit: "g", goal: goals?.protein_goal, color: "#60a5fa" },
    { label: "Carbs", value: Math.round(totals.carbs), unit: "g", goal: goals?.carb_goal, color: "#4ade80" },
    { label: "Fat", value: Math.round(totals.fat), unit: "g", goal: goals?.fat_goal, color: "#facc15" },
  ];

  const handleShare = async () => {
    if (!cardRef.current) return;
    setCapturing(true);
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 3, useCORS: true });
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "macros.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Nutrition", text: `📊 ${moment(date).format("MMM D, YYYY")} — ${Math.round(totals.calories)} kcal` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `macros-${date}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setCapturing(false);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center px-5 gap-6">
      <div className="w-full flex items-center justify-between">
        <p className="text-sm font-bold text-muted-foreground">Share your day</p>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* The shareable card */}
      <div ref={cardRef} style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}
        className="w-full max-w-sm rounded-3xl p-7 space-y-5 shadow-2xl">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#818cf8" }}>
            {moment(date).format("dddd")}
          </p>
          <p className="text-2xl font-black text-white mt-0.5">{moment(date).format("MMMM D, YYYY")}</p>
        </div>

        {/* Big calorie number */}
        <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/10">
          <p className="text-6xl font-black text-white tracking-tight">{Math.round(totals.calories)}</p>
          <p className="text-sm text-white/50 mt-1 font-semibold">CALORIES</p>
          {goals?.calorie_goal > 0 && (
            <div className="mt-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${caloriePercent}%`, background: "linear-gradient(90deg, #6366f1, #818cf8)" }} />
              </div>
              <p className="text-xs text-white/40 mt-1">{caloriePercent}% of daily goal</p>
            </div>
          )}
        </div>

        {/* Macros row */}
        <div className="grid grid-cols-3 gap-3">
          {macros.map(({ label, value, unit, goal, color }) => (
            <div key={label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
              <p className="text-xl font-black" style={{ color }}>{value}<span className="text-sm font-bold">{unit}</span></p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-0.5">{label}</p>
              {goal > 0 && <p className="text-[9px] text-white/25 mt-0.5">/ {goal}{unit}</p>}
            </div>
          ))}
        </div>


      </div>

      <div className="flex gap-3 w-full max-w-sm">
        <Button variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 h-12 rounded-2xl font-bold gap-2" onClick={handleShare} disabled={capturing}>
          {capturing ? "Preparing…" : (
            <>
              {typeof navigator !== "undefined" && navigator.share ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {typeof navigator !== "undefined" && navigator.share ? "Share" : "Download"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
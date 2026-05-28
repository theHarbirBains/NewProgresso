import { useRef, useState } from "react";
import { X, Share2, Download, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function WorkoutShareCard({ workout, onClose }) {
  const cardRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const durationMin = Math.round((workout.duration_seconds || 0) / 60);
  const exercises = (workout.exercises || []).filter((ex) => ex.top_set_weight > 0);

  const handleShare = async () => {
    setCapturing(true);
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: "#0f1117",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    setCapturing(false);

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();

    if (navigator.share && navigator.canShare({ files: [new File([blob], "workout.png", { type: "image/png" })] })) {
      await navigator.share({
        files: [new File([blob], "workout.png", { type: "image/png" })],
        title: workout.name,
      });
    } else {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `workout-${moment(workout.started_at).format("YYYY-MM-DD")}.png`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Shareable card */}
        <div ref={cardRef} className="rounded-3xl overflow-hidden p-6 space-y-4"
          style={{ background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1520 100%)" }}>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#3b82f6" }}>
                {moment(workout.started_at).format("ddd, MMM D, YYYY")}
              </p>
              <h2 className="text-2xl font-black text-white mt-0.5">{workout.name}</h2>
              <p className="text-sm mt-1" style={{ color: "#64748b" }}>{workout.category}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white">{durationMin}<span className="text-sm font-normal" style={{ color: "#64748b" }}>m</span></p>
              <p className="text-xs" style={{ color: "#64748b" }}>duration</p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

          {/* Exercises */}
          <div className="space-y-2.5">
            {exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3b82f6" }} />
                  <span className="text-sm font-semibold text-white truncate">{ex.exercise_name}</span>
                  <span className="text-xs shrink-0" style={{ color: "#64748b" }}>{ex.muscle_group}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <Trophy className="w-3.5 h-3.5" style={{ color: "#f97316" }} />
                  <span className="text-sm font-black" style={{ color: "#f97316" }}>
                    {ex.top_set_weight} × {ex.top_set_reps}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <div className="flex items-center justify-end">
            <span className="text-xs" style={{ color: "#475569" }}>
              {exercises.length} exercises · {(workout.total_volume || 0).toLocaleString()} lb
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12 rounded-2xl gap-2" onClick={onClose}>
            <X className="w-4 h-4" /> Close
          </Button>
          <Button className="flex-1 h-12 rounded-2xl gap-2 font-bold" onClick={handleShare} disabled={capturing}>
            {capturing ? "Preparing..." : <><Share2 className="w-4 h-4" /> Share</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
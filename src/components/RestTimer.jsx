import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESETS = [60, 90, 120, 180];

export default function RestTimer({ onClose }) {
  const [seconds, setSeconds] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    } else {
      clearInterval(intervalRef.current);
      if (remaining <= 0 && running) {
        setRunning(false);
        try { navigator.vibrate?.(300); } catch {}
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-muted-foreground" onClick={onClose}>
        <X className="w-6 h-6" />
      </Button>
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">Rest Timer</p>

      <div className="relative w-48 h-48 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={remaining <= 0 ? "hsl(var(--accent))" : "hsl(var(--primary))"} strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-5xl font-black tabular-nums ${remaining <= 0 ? "text-accent" : "text-foreground"}`}>
            {fmt(remaining)}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        {PRESETS.map((t) => (
          <Button key={t} variant={seconds === t ? "default" : "secondary"} size="sm"
            className="rounded-full min-w-[56px]"
            onClick={() => { setSeconds(t); setRemaining(t); setRunning(false); }}>
            {fmt(t)}
          </Button>
        ))}
      </div>

      <div className="flex gap-4">
        <Button variant="secondary" size="icon" className="w-14 h-14 rounded-full"
          onClick={() => { setRemaining(seconds); setRunning(false); }}>
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button size="icon" className="w-14 h-14 rounded-full"
          onClick={() => setRunning(!running)}>
          {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}
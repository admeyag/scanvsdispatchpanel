import { useEffect, useState } from "react";
import purplleLogo from "@/assets/purplle-splash.png";

export function Preloader({
  message = "Loading compliance data…",
  maxMs = 1500,
}: {
  message?: string;
  maxMs?: number;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), maxMs);
    return () => clearTimeout(t);
  }, [maxMs]);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-br from-[oklch(0.98_0.02_320)] via-[oklch(0.96_0.04_320)] to-[oklch(0.92_0.08_320)] backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 -m-6 animate-pulse rounded-full bg-[oklch(0.7_0.25_320_/_0.25)] blur-2xl" />
          <div className="relative grid h-28 w-28 place-items-center rounded-3xl bg-white p-4 shadow-[0_20px_60px_-15px_oklch(0.4_0.25_320_/_0.5)] ring-1 ring-[oklch(0.7_0.2_320_/_0.3)]">
            <img src={purplleLogo} alt="Purplle" className="h-full w-full object-contain" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[oklch(0.5_0.28_320)] [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[oklch(0.55_0.27_335)] [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[oklch(0.6_0.25_350)]" />
          </div>
          <p className="text-sm font-medium tracking-wide text-[oklch(0.4_0.2_320)]">{message}</p>
        </div>
      </div>
    </div>
  );
}

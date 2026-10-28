import { useEffect, useRef, useState, type ReactNode } from "react";
import sakura from "@/assets/bg-sakura.jpg";
import sky from "@/assets/bg-sky.jpg";
import stars from "@/assets/bg-stars.jpg";
import mascot from "@/assets/mascot.png";
import type { BgKey, SlideData } from "@/lib/board";
import { WidgetView } from "./widgets";

const BG: Record<BgKey, string | null> = { sakura, sky, stars, cream: null };

export function ScaledSlide({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute"
        style={{ width: 1920, height: 1080, left: "50%", top: "50%", marginLeft: -960, marginTop: -540, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

export function SlideView({ data, names, thumb = false }: { data: SlideData; names: string[]; thumb?: boolean }) {
  const img = BG[data.bg];
  const lines = data.body.split("\n").filter(Boolean);
  return (
    <div className="slide-content bg-background font-body" style={img ? { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      {!img && <div className="absolute inset-0 paper-dots" />}
      <div className="absolute inset-[36px] rounded-[64px] border-[10px] border-dashed border-card/80 pointer-events-none" />
      <div className="relative flex h-full gap-12 p-[90px]">
        <div className="flex w-[980px] shrink-0 flex-col">
          <div className="widget-card rounded-[56px] p-12">
            <h1 className="slide-title font-display text-foreground">{data.heading}</h1>
            <ul className="mt-8 space-y-5">
              {lines.map((l, i) => (
                <li key={i} className="slide-body-lg flex items-start gap-5 text-foreground">
                  <span className="mt-1 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary font-display text-primary-foreground" style={{ fontSize: 30 }}>{i + 1}</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
          <img src={mascot} alt="" width={1024} height={1024} className="mt-auto -mb-6 h-[260px] w-[260px] drop-shadow-xl" />
        </div>
        <div className={`flex min-w-0 flex-1 flex-col gap-8 ${thumb ? "pointer-events-none" : ""}`}>
          {data.widgets.filter((w) => !thumb || w.type !== "spotify").map((w) => (
            <WidgetView key={w.id} w={w} names={names} />
          ))}
        </div>
      </div>
    </div>
  );
}

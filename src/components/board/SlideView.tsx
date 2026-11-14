import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import sunset from "@/assets/bg-hero-sunset.jpg";
import sky from "@/assets/bg-hero-sky.jpg";
import night from "@/assets/bg-hero-night.jpg";
import { artFor } from "@/lib/art";
import { subjectDesign } from "@/lib/subject-design";
import { subjectBackground } from "@/lib/subject-backgrounds";
import { useSubjectThemes } from "@/lib/subject-theme";
import type { BgKey, SlideData } from "@/lib/board";
import { WidgetView } from "./widgets";
import { assessmentWidgets, isAssessment } from "@/lib/library";

const BG: Record<BgKey, string | null> = { sakura: sunset, sky, stars: night, cream: null };

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
  const subject = subjectDesign(data);
  const theme = useSubjectThemes()[subject.key] ?? {};
  const themeBg = theme.background && theme.background !== "subject" ? BG[theme.background] : subjectBackground(subject.key);
  const img = data.backgroundStyle === "alternate" ? BG[data.bg] : themeBg;
  const exam = isAssessment(data);
  const widgets = exam ? assessmentWidgets(data.widgets) : data.widgets;
  const lines = data.body.split("\n").filter(Boolean);
  const vars: Record<string, string> = {};
  if (img) vars["backgroundImage"] = `url(${img})`;
  if (theme.ink) vars["--subject-ink"] = theme.ink;
  if (theme.accent) vars["--subject-accent"] = theme.accent;
  if (theme.font) vars["--subject-font"] = `"${theme.font}", sans-serif`;
  const card = theme.card ?? "left";
  return (
    <div data-subject={subject.key} data-card={card} className="slide-content subject-slide bg-background font-body" style={vars as CSSProperties}>
      {!img && <div className="absolute inset-0 paper-dots" />}
      <div className="subject-wash" />
      <div className="subject-layout">
        <div className={`subject-message ${lines.length > 6 ? "subject-message-dense" : ""}`}>
          <div className="subject-identifier">
            {card !== "hidden" && <img src={artFor(data)} alt={`${subject.label} schedule card`} className="subject-card-image" />}
            <div>
              <div className="subject-label">{subject.label}</div>
              {data.day && <div className="subject-day">{({ Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" })[data.day]}</div>}
            </div>
          </div>
          <h1 className="slide-title font-display text-foreground">{data.heading}</h1>
          <ul className="subject-steps">
            {lines.map((l, i) => (
              <li key={i} className="subject-step">
                <span className="subject-step-number">{i + 1}</span>
                <span className="subject-step-text">{l}</span>
              </li>
            ))}
          </ul>
          <div className="subject-footer">{exam ? "Assessment · Do your best" : "Hero Board"}</div>
        </div>
        <div className={`subject-tools ${thumb ? "pointer-events-none" : ""}`}>
          {widgets.filter((w) => !thumb || (w.type !== "spotify" && w.type !== "lesson")).map((w) => (
            <WidgetView key={w.id} w={w} names={names} />
          ))}
        </div>
      </div>
    </div>
  );
}

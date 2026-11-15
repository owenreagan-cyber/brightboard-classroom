import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventsOn, monthDates, schoolDayStatus, type CalEvent } from "@/lib/calendar";

type Props = { month: Date; events: CalEvent[]; verified: boolean; today: string; onMonth: (date: Date) => void; onDate: (date: string) => void };
export function SchoolCalendar({ month, events, verified, today, onMonth, onDate }: Props) {
  return <section aria-label="School calendar" className="border-b bg-card p-4">
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg">School calendar</h2>
        <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-36 text-center font-bold">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <Button size="icon" variant="outline" aria-label="Next month" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <div className="ml-auto flex flex-wrap gap-3 text-xs"><span className="text-primary">School day</span><span className="text-destructive">Break / no school</span><span className="text-muted-foreground">Weekend</span></div>
      </div>
      <div className="grid grid-cols-7 border-l border-t">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="border-b border-r p-1 text-center text-xs font-bold">{d}</div>)}
        {monthDates(month).map((date) => {
          const status = schoolDayStatus(events, date, verified);
          const currentMonth = new Date(date + "T12:00").getMonth() === month.getMonth();
          const special = eventsOn(events, date).filter((e) => e.allDay && /first day of school|last day of school/i.test(e.summary));
          return <Button key={date} variant="ghost" aria-label={`${date}: ${status.label}`} onClick={() => onDate(date)} className={`h-auto min-h-20 min-w-0 flex-col items-start justify-start gap-1 whitespace-normal rounded-none border-b border-r p-1.5 text-left sm:min-h-24 sm:p-2 ${status.kind === "off" ? "bg-destructive/10 text-destructive" : status.kind === "school" ? "text-primary" : "bg-muted/40 text-muted-foreground"} ${currentMonth ? "" : "opacity-50"} ${date === today ? "ring-2 ring-inset ring-primary" : ""}`}>
            <span className="text-sm font-bold">{Number(date.slice(-2))}{date === today ? " •" : ""}</span>
            <span className="w-full break-words text-[10px] leading-tight sm:text-xs">{status.label}</span>
            {special.map((e) => <span key={e.id} className="w-full break-words text-[10px] font-bold leading-tight sm:text-xs">{e.summary}</span>)}
          </Button>;
        })}
      </div>
    </div>
  </section>;
}
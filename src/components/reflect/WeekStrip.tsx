import { cn } from "@/lib/utils";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** The last seven days, with a dot for each day that has a reflection. */
export default function WeekStrip({ dates, className }: { dates: Array<string | Date>; className?: string }) {
  const reflected = new Set(dates.map((value) => dayKey(new Date(value))));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const count = days.filter((day) => reflected.has(dayKey(day))).length;

  return (
    <div className={className}>
      <p className="sr-only">{`Reflected on ${count} of the last 7 days.`}</p>
      <ol className="grid grid-cols-7 gap-1.5" aria-hidden>
        {days.map((day, index) => {
          const done = reflected.has(dayKey(day));
          const today = index === 6;
          return (
            <li key={day.toISOString()} className="flex flex-col items-center gap-1">
              <span className={cn("text-micro", today ? "font-semibold text-foreground" : "text-subtle-foreground")}>
                {day.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span
                className={cn(
                  "size-7 rounded-full border",
                  done ? "border-primary bg-primary" : "border-line bg-surface-elevated",
                  today && !done && "border-dashed border-line-strong",
                )}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

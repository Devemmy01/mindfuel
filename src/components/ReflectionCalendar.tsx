"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, subMonths, eachDayOfInterval } from "date-fns";
import { PostType } from "@/types";

interface ReflectionCalendarProps {
  posts: PostType[];
  className?: string;
}

interface MonthData {
  date: Date;
  name: string;
  year: string;
  days: Date[];
  padding: number;
}

export default function ReflectionCalendar({ posts, className = "" }: ReflectionCalendarProps) {
  const [hoveredDay, setHoveredDay] = React.useState<{ day: Date; count: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate the last 12 months, ending with the current month
  const months = useMemo<MonthData[]>(() => {
    const today = new Date();
    const list: MonthData[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const daysInMonth = eachDayOfInterval({ start, end });
      const startDayOfWeek = start.getDay();

      list.push({
        date: monthDate,
        name: format(monthDate, "MMMM"),
        year: format(monthDate, "yyyy"),
        days: daysInMonth,
        padding: startDayOfWeek,
      });
    }
    return list;
  }, []);

  // Map posts to dates for quick lookup
  const postDates = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((post) => {
      const dateKey = format(new Date(post.createdAt), "yyyy-MM-dd");
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });
    return map;
  }, [posts]);

  // Auto-scroll to the end (current month) on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [months]);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-[12px] font-black text-white/40 uppercase tracking-[0.15em]">Reflection History</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Less</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((level) => {
              let color = "bg-white/[0.06]";
              if (level === 1) color = "bg-green-500/25";
              if (level === 2) color = "bg-green-500/55";
              if (level === 3) color = "bg-green-500/90";
              return <div key={level} className={`w-2.5 h-2.5 rounded-[2px] ${color}`} />;
            })}
          </div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">More</span>
        </div>
      </div>

      <div className="relative bg-white/[0.01] border border-white/5 rounded-3xl p-4 min-h-[180px]">
        {/* Hover tooltip */}
        <div className="h-8 mb-2 flex items-center justify-center">
          <AnimatePresence>
            {hoveredDay ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="bg-brand-green/10 border border-brand-green/20 px-3 py-1 rounded-full flex items-center gap-2"
              >
                <span className="text-[11px] font-bold text-brand-green">
                  {hoveredDay.count} {hoveredDay.count === 1 ? "reflection" : "reflections"}
                </span>
                <span className="text-[11px] text-white/40">•</span>
                <span className="text-[11px] font-medium text-white/70">
                  {format(hoveredDay.day, "MMM d, yyyy")}
                </span>
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="text-[10px] font-medium text-white uppercase tracking-widest"
              >
                Hover to explore
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Scrollable months */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto no-scrollbar scroll-smooth pt-2 flex gap-4"
        >
          {months.map((m) => (
            <div
              key={`${m.name}-${m.year}`}
              className="flex-shrink-0 bg-white/[0.02] border border-white/5 rounded-2xl p-3 w-[140px] flex flex-col justify-between"
            >
              <div className="text-center mb-3">
                <span className="text-[11px] font-black text-white/70 uppercase tracking-wider">
                  {m.name}
                </span>
                <span className="text-[9px] font-bold text-white/30 block tracking-wider mt-0.5">
                  {m.year}
                </span>
              </div>

              <div>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-[8px] font-black text-white/20 text-center mb-1.5">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                    <div key={idx} className="w-3.5 h-3.5 flex items-center justify-center">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* Padding */}
                  {Array.from({ length: m.padding }).map((_, idx) => (
                    <div key={`pad-${idx}`} className="w-3.5 h-3.5 bg-transparent" />
                  ))}

                  {/* Days */}
                  {m.days.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const count = postDates.get(dateKey) || 0;

                    let bgColor = "bg-white/[0.06]";
                    const borderColor = "border-white/[0.03]";
                    let shadow = "";

                    if (count === 1) {
                      bgColor = "bg-green-500/25";
                    } else if (count === 2) {
                      bgColor = "bg-green-500/55";
                    } else if (count >= 3) {
                      bgColor = "bg-green-500/90";
                      shadow = "shadow-[0_0_8px_rgba(0,191,99,0.4)]";
                    }

                    return (
                      <motion.div
                        key={dateKey}
                        whileHover={{ scale: 1.25, zIndex: 10 }}
                        onMouseEnter={() => setHoveredDay({ day, count })}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3.5 h-3.5 rounded-[3px] ${bgColor} border ${borderColor} ${shadow} transition-all cursor-pointer`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

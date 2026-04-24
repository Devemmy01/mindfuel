"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, subDays, eachDayOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import { PostType } from "@/types";

interface ReflectionCalendarProps {
  posts: PostType[];
  className?: string;
}

export default function ReflectionCalendar({ posts, className = "" }: ReflectionCalendarProps) {
  // Generate the last 365 days for a full year view
  const days = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 364);
    return eachDayOfInterval({ start: startDate, end: today });
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

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-[12px] font-black text-white/40 uppercase tracking-[0.15em]">Reflection History</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Less</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((level) => {
              let color = "bg-white/[0.06]";
              if (level === 1) color = "bg-green-500/30";
              if (level === 2) color = "bg-green-500/75";
              if (level === 3) color = "bg-green-500/90";
              return <div key={level} className={`w-2.5 h-2.5 rounded-[2px] ${color}`} />;
            })}
          </div>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">More</span>
        </div>
      </div>

      <div className="relative bg-white/[0.01] border border-white/5 rounded-2xl p-4">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max" style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const count = postDates.get(dateKey) || 0;
              
              // Define color based on intensity
              let bgColor = "bg-white/[0.06]";
              let borderColor = "border-white/[0.02]";
              let shadow = "";
              
              if (count === 1) {
                bgColor = "bg-green-500/40";
                borderColor = "border-green-500/20";
              } else if (count === 2) {
                bgColor = "bg-green-500/75";
                borderColor = "border-green-500/40";
              } else if (count >= 3) {
                bgColor = "bg-green-500/90";
                borderColor = "border-green-500/60";
                shadow = "shadow-[0_0_8px_rgba(0,191,99,0.4)]";
              }

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.3, zIndex: 10, transition: { duration: 0.1 } }}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] ${bgColor} border ${borderColor} ${shadow} transition-all cursor-pointer relative group`}
                >
                  {/* Custom Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[100]">
                    <div className="bg-[#0c0c0c] border border-white/10 px-2 py-1 rounded-md shadow-xl whitespace-nowrap">
                      <p className="text-[10px] font-bold text-white">
                        {count} {count === 1 ? 'reflection' : 'reflections'}
                      </p>
                      <p className="text-[9px] text-white/50">{format(day, "MMM d, yyyy")}</p>
                    </div>
                    <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Month labels */}
        <div className="flex justify-between mt-4 px-2">
          {eachMonthOfInterval({
            start: subMonths(new Date(), 11),
            end: new Date()
          }).map((month) => (
            <span key={month.toString()} className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
              {format(month, "MMM")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

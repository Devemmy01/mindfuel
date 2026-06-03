/**
 * MindFuel Milestone Definitions & Checker
 */

import { differenceInCalendarDays } from "date-fns";

export interface MilestoneDefinition {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Short description of exactly what the user must do to earn this badge */
  requirement: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: "first_reflection",
    label: "First Spark",
    emoji: "✨",
    description: "You shared your first reflection. Every journey starts with one step.",
    requirement: "Share your very first reflection post.",
    tier: "bronze",
  },
  {
    id: "streak_3",
    label: "Consistent Reflector",
    emoji: "🔥",
    description: "3 days of reflection in a row. Consistency is where growth begins.",
    requirement: "Reflect 3 days in a row.",
    tier: "bronze",
  },
  {
    id: "streak_7",
    label: "Weekly Reflection Habit",
    emoji: "⚔️",
    description: "A full week of consistent reflection. You\'re building a real habit.",
    requirement: "Reflect every day for 7 consecutive days.",
    tier: "silver",
  },
  {
    id: "streak_14",
    label: "Fortnight Focus",
    emoji: "💎",
    description: "14-day streak! Two solid weeks. Consistency is your superpower.",
    requirement: "Maintain an unbroken 14-day reflection streak.",
    tier: "silver",
  },
  {
    id: "streak_30",
    label: "Monthly Master",
    emoji: "👑",
    description: "30-day streak! A whole month of daily reflection. Truly remarkable.",
    requirement: "Keep a reflection streak alive for a full 30 days.",
    tier: "gold",
  },
  {
    id: "streak_100",
    label: "Legendary",
    emoji: "🌟",
    description: "100-day streak! You are an absolute legend of mindfulness.",
    requirement: "Reach an extraordinary 100-day reflection streak.",
    tier: "diamond",
  },
  {
    id: "posts_10",
    label: "Insight Contributor",
    emoji: "💡",
    description: "10 reflections shared. You\'re actively contributing to your growth journey.",
    requirement: "Publish a total of 10 reflections.",
    tier: "bronze",
  },
  {
    id: "posts_25",
    label: "Prolific Mind",
    emoji: "📚",
    description: "25 reflections! You've built a real library of thoughts.",
    requirement: "Publish a total of 25 reflections.",
    tier: "silver",
  },
  {
    id: "posts_50",
    label: "Deep Thinker",
    emoji: "🧠",
    description: "50 reflections! Half a century of mindful moments.",
    requirement: "Publish a total of 50 reflections.",
    tier: "gold",
  },
  {
    id: "posts_100",
    label: "100 Reflections Shared",
    emoji: "🏆",
    description: "100 reflections — a milestone that speaks for itself. You\'ve built evidence of real growth.",
    requirement: "Publish a total of 100 reflections.",
    tier: "diamond",
  },
  {
    id: "early_bird",
    label: "Early Bird",
    emoji: "🌅",
    description: "You reflected before 6am. The world belongs to early risers.",
    requirement: "Publish a reflection before 6:00 AM.",
    tier: "bronze",
  },
  {
    id: "night_owl",
    label: "Night Owl",
    emoji: "🦉",
    description: "You reflected after 11pm. Deep thoughts come alive after midnight.",
    requirement: "Publish a reflection after 11:00 PM.",
    tier: "bronze",
  },
];

export function getMilestoneById(id: string): MilestoneDefinition | undefined {
  return MILESTONES.find((m) => m.id === id);
}

export const TIER_COLORS = {
  bronze: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", glow: "shadow-[0_0_20px_rgba(249,115,22,0.3)]" },
  silver: { bg: "bg-slate-400/10", border: "border-slate-400/30", text: "text-slate-300", glow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]" },
  gold: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]" },
  diamond: { bg: "bg-brand-green/10", border: "border-brand-green/30", text: "text-brand-green", glow: "shadow-[0_0_20px_rgba(0,191,99,0.4)]" },
};

/**
 * Check which new milestones a user has unlocked after creating a post.
 * Returns an array of newly unlocked milestone IDs.
 */
export function checkNewMilestones({
  existingMilestoneIds,
  totalPostCount,
  newStreakDays,
  postHour,
  isFirstPost,
}: {
  existingMilestoneIds: string[];
  totalPostCount: number;
  newStreakDays: number;
  postHour: number;
  isFirstPost: boolean;
}): string[] {
  const earned = new Set(existingMilestoneIds);
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) {
      newlyUnlocked.push(id);
    }
  };

  check("first_reflection", isFirstPost);
  check("streak_3", newStreakDays >= 3);
  check("streak_7", newStreakDays >= 7);
  check("streak_14", newStreakDays >= 14);
  check("streak_30", newStreakDays >= 30);
  check("streak_100", newStreakDays >= 100);
  check("posts_10", totalPostCount >= 10);
  check("posts_25", totalPostCount >= 25);
  check("posts_50", totalPostCount >= 50);
  check("posts_100", totalPostCount >= 100);
  check("early_bird", postHour < 6);
  check("night_owl", postHour >= 23);

  return newlyUnlocked;
}

function normalizeDate(input: string | Date): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

type ReflectionRecord = {
  createdAt: string | Date;
};

/**
 * Backfill milestones from historical reflection data.
 * Used to unlock badges for users who qualified before milestone tracking existed.
 */
export function getHistoricalMilestoneUnlocks(
  reflections: ReflectionRecord[],
  existingMilestoneIds: string[] = []
): string[] {
  if (reflections.length === 0) return [];

  const earned = new Set(existingMilestoneIds);
  const unlocks: string[] = [];

  const sortedByCreatedAt = [...reflections].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const totalPostCount = sortedByCreatedAt.length;

  const uniqueDays = Array.from(
    new Set(sortedByCreatedAt.map((reflection) => normalizeDate(reflection.createdAt).toISOString()))
  )
    .map((day) => new Date(day))
    .sort((a, b) => a.getTime() - b.getTime());

  let longestStreak = 0;
  let currentStreak = 0;

  uniqueDays.forEach((day, index) => {
    if (index === 0) {
      currentStreak = 1;
    } else {
      const previousDay = uniqueDays[index - 1];
      currentStreak = differenceInCalendarDays(day, previousDay) === 1 ? currentStreak + 1 : 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
  });

  const hasEarlyBird = sortedByCreatedAt.some((reflection) => new Date(reflection.createdAt).getHours() < 6);
  const hasNightOwl = sortedByCreatedAt.some((reflection) => new Date(reflection.createdAt).getHours() >= 23);

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) {
      unlocks.push(id);
      earned.add(id);
    }
  };

  check("first_reflection", totalPostCount > 0);
  check("streak_3", longestStreak >= 3);
  check("streak_7", longestStreak >= 7);
  check("streak_14", longestStreak >= 14);
  check("streak_30", longestStreak >= 30);
  check("streak_100", longestStreak >= 100);
  check("posts_10", totalPostCount >= 10);
  check("posts_25", totalPostCount >= 25);
  check("posts_50", totalPostCount >= 50);
  check("posts_100", totalPostCount >= 100);
  check("early_bird", hasEarlyBird);
  check("night_owl", hasNightOwl);

  return unlocks;
}

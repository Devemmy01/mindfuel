/**
 * Utility functions for managing user reflection streaks
 */

/**
 * Calculate updated streak information when user creates a reflection
 * @param lastReflectionDate - The user's last reflection date
 * @param currentStreak - The user's current streak count
 * @param longestStreak - The user's all-time longest streak
 * @returns Object with updated streak info
 */
export function updateStreak(
  lastReflectionDate: Date | undefined,
  currentStreak: number,
  longestStreak: number
): {
  streakDays: number;
  lastReflectionDate: Date;
  longestStreak: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = currentStreak;
  let newLongestStreak = longestStreak;

  if (!lastReflectionDate) {
    // First reflection ever
    newStreak = 1;
    newLongestStreak = 1;
  } else {
    const lastDate = new Date(lastReflectionDate);
    lastDate.setHours(0, 0, 0, 0);

    const isToday = lastDate.getTime() === today.getTime();
    const isYesterday = lastDate.getTime() === yesterday.getTime();

    if (isToday) {
      // Already reflected today, don't change streak
      newStreak = currentStreak;
    } else if (isYesterday) {
      // Reflected yesterday, increment streak
      newStreak = currentStreak + 1;
    } else {
      // Didn't reflect yesterday, reset to 1
      newStreak = 1;
    }

    // Update longest streak
    newLongestStreak = Math.max(newStreak, longestStreak);
  }

  return {
    streakDays: newStreak,
    lastReflectionDate: today,
    longestStreak: newLongestStreak,
  };
}

/**
 * Check and potentially decay a streak if the user has missed days.
 * To be called when fetching a user profile.
 * @returns The corrected streak count
 */
export function decayStreak(
  lastReflectionDate: Date | string | undefined,
  currentStreak: number
): number {
  if (!lastReflectionDate || currentStreak === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastDate = new Date(lastReflectionDate);
  lastDate.setHours(0, 0, 0, 0);

  const isToday = lastDate.getTime() === today.getTime();
  const isYesterday = lastDate.getTime() === yesterday.getTime();

  // Streak is only valid if the last reflection was today or yesterday
  if (isToday || isYesterday) {
    return currentStreak;
  }

  // Otherwise, the streak is broken
  return 0;
}

/**
 * Format streak count for display
 * @param streakDays - Number of consecutive days
 * @returns Formatted string with fire emoji and count
 */
export function formatStreak(streakDays: number): string {
  if (streakDays === 0) return "Start your streak";
  if (streakDays === 1) return "🔥 1 day";
  return `🔥 ${streakDays} days`;
}

/**
 * Get streak milestone message
 * @param streakDays - Current streak count
 * @returns Encouraging message at milestone
 */
export function getStreakMilestoneMessage(streakDays: number): string | null {
  const milestones: { [key: number]: string } = {
    3: "🎉 3-day streak! You're building momentum!",
    7: "🚀 One week! Your reflection habit is forming!",
    14: "💎 Two weeks! Consistency is key!",
    30: "👑 One month! You're a reflection master!",
    100: "🌟 100 days! Absolutely legendary!",
  };

  return milestones[streakDays] || null;
}

/**
 * Recalculate streak based on user's actual posts
 * Used when a post is deleted to update streak and lastReflectionDate
 * @param postDates - Array of post creation dates, sorted newest first
 * @param longestStreak - User's all-time longest streak (preserved)
 * @returns Updated streak info (streak may be 0 if no posts or gap exists)
 */
export function recalculateStreakFromPosts(
  postDates: Date[],
  longestStreak: number
): {
  streakDays: number;
  lastReflectionDate: Date | undefined;
  longestStreak: number;
} {
  if (!postDates || postDates.length === 0) {
    // No posts left, streak is broken
    return {
      streakDays: 0,
      lastReflectionDate: undefined,
      longestStreak: longestStreak,
    };
  }

  // Get the most recent post date and normalize it
  const mostRecentPostDate = new Date(postDates[0]);
  mostRecentPostDate.setHours(0, 0, 0, 0);

  // Create a set of dates (as strings) when the user posted
  const postDateSet = new Set<string>();
  postDates.forEach((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    postDateSet.add(d.toISOString().split("T")[0]);
  });

  // Calculate streak by going backwards from the most recent post
  let streakDays = 0;
  const checkDate = new Date(mostRecentPostDate);

  while (postDateSet.has(checkDate.toISOString().split("T")[0])) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    streakDays,
    lastReflectionDate: mostRecentPostDate,
    longestStreak: longestStreak,
  };
}

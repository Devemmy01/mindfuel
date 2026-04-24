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

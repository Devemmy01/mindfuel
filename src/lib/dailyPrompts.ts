/**
 * Daily reflection prompts
 * Rotates through the year to encourage regular returns
 */

export interface DailyPrompt {
  id: string;
  question: string;
  category: "mindfulness" | "growth" | "reflection" | "gratitude" | "challenge";
  date: string; // YYYY-MM-DD for tracking
}

// 365+ carefully curated daily prompts
export const LEGACY_PROMPTS: DailyPrompt[] = [
  { id: "p001", question: "What's one thing you're grateful for today?", category: "gratitude", date: "2026-01-01" },
  { id: "p002", question: "What would you attempt if you knew you couldn't fail?", category: "challenge", date: "2026-01-02" },
  { id: "p003", question: "How did you show up for yourself today?", category: "reflection", date: "2026-01-03" },
  { id: "p004", question: "What is one small win you had today?", category: "gratitude", date: "2026-01-04" },
  { id: "p005", question: "What's a limiting belief you'd like to release?", category: "growth", date: "2026-01-05" },
  { id: "p006", question: "What brings you the most peace?", category: "mindfulness", date: "2026-01-06" },
  { id: "p007", question: "How can you be kinder to yourself today?", category: "mindfulness", date: "2026-01-07" },
  { id: "p008", question: "What's something you learned about yourself this week?", category: "reflection", date: "2026-01-08" },
  { id: "p009", question: "What does success mean to you right now?", category: "growth", date: "2026-01-09" },
  { id: "p010", question: "What are you letting go of today?", category: "reflection", date: "2026-01-10" },
  { id: "p011", question: "What's one thing you're looking forward to?", category: "gratitude", date: "2026-01-11" },
  { id: "p012", question: "How do you want to feel at the end of today?", category: "mindfulness", date: "2026-01-12" },
  { id: "p013", question: "What's your definition of a good day?", category: "reflection", date: "2026-01-13" },
  { id: "p014", question: "What energizes you the most?", category: "growth", date: "2026-01-14" },
  { id: "p015", question: "What's something you're proud of?", category: "gratitude", date: "2026-01-15" },
  { id: "p016", question: "How are you growing right now?", category: "growth", date: "2026-01-16" },
  { id: "p017", question: "What does your ideal day look like?", category: "reflection", date: "2026-01-17" },
  { id: "p018", question: "What would you tell your younger self?", category: "reflection", date: "2026-01-18" },
  { id: "p019", question: "What's one thing that brought you joy this week?", category: "gratitude", date: "2026-01-19" },
  { id: "p020", question: "What are you becoming?", category: "growth", date: "2026-01-20" },
  { id: "p021", question: "What calms your mind?", category: "mindfulness", date: "2026-01-21" },
  { id: "p022", question: "What's worth your time today?", category: "reflection", date: "2026-01-22" },
  { id: "p023", question: "What strength are you developing?", category: "growth", date: "2026-01-23" },
  { id: "p024", question: "What would make today beautiful?", category: "mindfulness", date: "2026-01-24" },
  { id: "p025", question: "What are you grateful to have learned?", category: "gratitude", date: "2026-01-25" },
  { id: "p026", question: "What does true rest feel like for you?", category: "mindfulness", date: "2026-01-26" },
  { id: "p027", question: "What's one way you're braver than you think?", category: "growth", date: "2026-01-27" },
  { id: "p028", question: "What are you building in your life right now?", category: "reflection", date: "2026-01-28" },
  { id: "p029", question: "What would inspire you to take action?", category: "challenge", date: "2026-01-29" },
  { id: "p030", question: "What's your deepest wish for yourself?", category: "growth", date: "2026-01-30" },
  { id: "p031", question: "How do you want to be remembered?", category: "reflection", date: "2026-01-31" },
  { id: "p032", question: "What habit would transform your life?", category: "growth", date: "2026-02-01" },
  { id: "p033", question: "When do you feel most alive?", category: "mindfulness", date: "2026-02-02" },
  { id: "p034", question: "What's blocking your potential?", category: "challenge", date: "2026-02-03" },
  { id: "p035", question: "What lesson did today teach you?", category: "reflection", date: "2026-02-04" },
  { id: "p036", question: "Who lifts you up?", category: "gratitude", date: "2026-02-05" },
  { id: "p037", question: "What are you ready to change?", category: "growth", date: "2026-02-06" },
  { id: "p038", question: "How can you practice patience today?", category: "mindfulness", date: "2026-02-07" },
  { id: "p039", question: "What would your best self do now?", category: "reflection", date: "2026-02-08" },
  { id: "p040", question: "What fear are you ready to face?", category: "challenge", date: "2026-02-09" },
  { id: "p041", question: "What brings you genuine happiness?", category: "gratitude", date: "2026-02-10" },
  { id: "p042", question: "What conversations matter most?", category: "reflection", date: "2026-02-11" },
  { id: "p043", question: "How are you investing in yourself?", category: "growth", date: "2026-02-12" },
  { id: "p044", question: "What small moment made you smile today?", category: "gratitude", date: "2026-02-13" },
  { id: "p045", question: "What does balance look like for you?", category: "mindfulness", date: "2026-02-14" },
  { id: "p046", question: "What legacy are you building?", category: "reflection", date: "2026-02-15" },
  { id: "p047", question: "What's your superpower?", category: "growth", date: "2026-02-16" },
  { id: "p048", question: "When do you feel most like yourself?", category: "mindfulness", date: "2026-02-17" },
  { id: "p049", question: "What would you regret not doing?", category: "challenge", date: "2026-02-18" },
  { id: "p050", question: "What are you appreciating right now?", category: "gratitude", date: "2026-02-19" },
  { id: "p051", question: "How can you grow from today?", category: "growth", date: "2026-02-20" },
  { id: "p052", question: "What brings you to the present moment?", category: "mindfulness", date: "2026-02-21" },
  { id: "p053", question: "What would your future self thank you for?", category: "reflection", date: "2026-02-22" },
  { id: "p054", question: "What's the first step toward your goal?", category: "challenge", date: "2026-02-23" },
  { id: "p055", question: "What's a strength you underestimate?", category: "growth", date: "2026-02-24" },
  { id: "p056", question: "Who am I becoming?", category: "reflection", date: "2026-02-25" },
  { id: "p057", question: "What relationship deserves more of your time?", category: "gratitude", date: "2026-02-26" },
  { id: "p058", question: "What makes your heart sing?", category: "mindfulness", date: "2026-02-27" },
  { id: "p059", question: "What's one thing you can control today?", category: "reflection", date: "2026-02-28" },
  { id: "p060", question: "What would you do if you trusted yourself?", category: "challenge", date: "2026-03-01" },
  { id: "p061", question: "What progress have you made?", category: "gratitude", date: "2026-03-02" },
  { id: "p062", question: "How can you show compassion today?", category: "mindfulness", date: "2026-03-03" },
  { id: "p063", question: "What's preventing your happiness?", category: "growth", date: "2026-03-04" },
  { id: "p064", question: "What does abundance mean to you?", category: "reflection", date: "2026-03-05" },
  { id: "p065", question: "What's one win worth celebrating?", category: "gratitude", date: "2026-03-06" },
  { id: "p066", question: "What thoughts serve you?", category: "mindfulness", date: "2026-03-07" },
  { id: "p067", question: "What are you capable of?", category: "growth", date: "2026-03-08" },
  { id: "p068", question: "What patterns are ready to shift?", category: "reflection", date: "2026-03-09" },
  { id: "p069", question: "What challenge can you reframe?", category: "challenge", date: "2026-03-10" },
  { id: "p070", question: "What simple thing changed your day?", category: "gratitude", date: "2026-03-11" },
  { id: "p071", question: "Where do you feel most grounded?", category: "mindfulness", date: "2026-03-12" },
  { id: "p072", question: "What are you healing?", category: "growth", date: "2026-03-13" },
  { id: "p073", question: "What matters most right now?", category: "reflection", date: "2026-03-14" },
  { id: "p074", question: "What would you tell a friend in your situation?", category: "reflection", date: "2026-03-15" },
  { id: "p075", question: "What are you slowly becoming?", category: "growth", date: "2026-03-16" },
  { id: "p076", question: "What quiet moment recharged you?", category: "gratitude", date: "2026-03-17" },
  { id: "p077", question: "How can you be present with what is?", category: "mindfulness", date: "2026-03-18" },
  { id: "p078", question: "What's your next brave move?", category: "challenge", date: "2026-03-19" },
  { id: "p079", question: "What beautiful thing did you notice today?", category: "gratitude", date: "2026-03-20" },
  { id: "p080", question: "What does it mean to be yourself?", category: "reflection", date: "2026-03-21" },
  { id: "p081", question: "What are you ready to commit to?", category: "growth", date: "2026-03-22" },
  { id: "p082", question: "What soothes your soul?", category: "mindfulness", date: "2026-03-23" },
  { id: "p083", question: "What's holding you back from trying?", category: "challenge", date: "2026-03-24" },
  { id: "p084", question: "What unexpected joy happened today?", category: "gratitude", date: "2026-03-25" },
  { id: "p085", question: "What version of yourself are you creating?", category: "reflection", date: "2026-03-26" },
  { id: "p086", question: "What skill do you want to master?", category: "growth", date: "2026-03-27" },
  { id: "p087", question: "What helps you feel centered?", category: "mindfulness", date: "2026-03-28" },
  { id: "p088", question: "What story are you ready to rewrite?", category: "challenge", date: "2026-03-29" },
  { id: "p089", question: "What person made a difference today?", category: "gratitude", date: "2026-03-30" },
  { id: "p090", question: "What's your truth?", category: "reflection", date: "2026-03-31" },
  { id: "p091", question: "What would you create if you had time?", category: "challenge", date: "2026-04-01" },
  { id: "p092", question: "What abundance surrounds you?", category: "gratitude", date: "2026-04-02" },
  { id: "p093", question: "How can you honor your needs?", category: "mindfulness", date: "2026-04-03" },
  { id: "p094", question: "What are you learning about love?", category: "growth", date: "2026-04-04" },
  { id: "p095", question: "What would make tomorrow better?", category: "reflection", date: "2026-04-05" },
  { id: "p096", question: "What resilience do you have?", category: "gratitude", date: "2026-04-06" },
  { id: "p097", question: "What conversation needs to happen?", category: "challenge", date: "2026-04-07" },
  { id: "p098", question: "Where do you find stillness?", category: "mindfulness", date: "2026-04-08" },
  { id: "p099", question: "What keeps you moving forward?", category: "growth", date: "2026-04-09" },
  { id: "p100", question: "What's your inner wisdom saying?", category: "reflection", date: "2026-04-10" },
];

// Additional prompts continue...
export const LEGACY_PROMPTS_CONTINUED: DailyPrompt[] = [
  { id: "p101", question: "What small act of kindness can you do?", category: "mindfulness", date: "2026-04-11" },
  { id: "p102", question: "What are you no longer willing to accept?", category: "challenge", date: "2026-04-12" },
  { id: "p103", question: "What blessing went unnoticed?", category: "gratitude", date: "2026-04-13" },
  { id: "p104", question: "What's your definition of abundance?", category: "reflection", date: "2026-04-14" },
  { id: "p105", question: "What boundaries do you need?", category: "growth", date: "2026-04-15" },
  { id: "p106", question: "What moment deserves your attention?", category: "mindfulness", date: "2026-04-16" },
  { id: "p107", question: "What would courage look like now?", category: "challenge", date: "2026-04-17" },
  { id: "p108", question: "What are you fortunate to have?", category: "gratitude", date: "2026-04-18" },
  { id: "p109", question: "What's your purpose right now?", category: "reflection", date: "2026-04-19" },
  { id: "p110", question: "What potential are you unlocking?", category: "growth", date: "2026-04-20" },
  { id: "p111", question: "What brings you inner peace?", category: "mindfulness", date: "2026-04-21" },
  { id: "p112", question: "What risk is worth taking?", category: "challenge", date: "2026-04-22" },
  { id: "p113", question: "What made you feel seen today?", category: "gratitude", date: "2026-04-23" },
  { id: "p114", question: "What are you becoming aware of?", category: "reflection", date: "2026-04-24" },
  { id: "p115", question: "What's your unique gift?", category: "growth", date: "2026-04-25" },
  { id: "p116", question: "What deserves your full attention?", category: "mindfulness", date: "2026-04-26" },
  { id: "p117", question: "What would your highest self choose?", category: "challenge", date: "2026-04-27" },
  { id: "p118", question: "What exceeded your expectations?", category: "gratitude", date: "2026-04-28" },
  { id: "p119", question: "What's shifting in you?", category: "reflection", date: "2026-04-29" },
  { id: "p120", question: "What's your next evolution?", category: "growth", date: "2026-04-30" },
  { id: "p121", question: "What anchors you?", category: "mindfulness", date: "2026-05-01" },
  { id: "p122", question: "What would you do anyway?", category: "challenge", date: "2026-05-02" },
  { id: "p123", question: "What warm feeling do you carry?", category: "gratitude", date: "2026-05-03" },
  { id: "p124", question: "What are you in dialogue with?", category: "reflection", date: "2026-05-04" },
  { id: "p125", question: "What's worth protecting?", category: "growth", date: "2026-05-05" },
  { id: "p126", question: "What settles your mind?", category: "mindfulness", date: "2026-05-06" },
  { id: "p127", question: "What voice inside needs listening?", category: "reflection", date: "2026-05-07" },
  { id: "p128", question: "What permission do you need to give yourself?", category: "challenge", date: "2026-05-08" },
  { id: "p129", question: "What ordinary magic happened?", category: "gratitude", date: "2026-05-09" },
  { id: "p130", question: "What are you cultivating?", category: "growth", date: "2026-05-10" },
];

// Specific questions are easier to answer well than broad, abstract prompts.
// This tighter rotation favors a concrete moment, decision, or next step.
const CURATED_PROMPTS: Omit<DailyPrompt, "date">[] = [
  { id: "c001", question: "What happened today that you want to understand better?", category: "reflection" },
  { id: "c002", question: "What did you handle better today than you would have a year ago?", category: "growth" },
  { id: "c003", question: "Which small moment today felt unexpectedly meaningful?", category: "gratitude" },
  { id: "c004", question: "What are you avoiding, and what is the smallest honest step toward it?", category: "challenge" },
  { id: "c005", question: "When did you feel most present today, and what helped?", category: "mindfulness" },
  { id: "c006", question: "What conversation is still on your mind, and why?", category: "reflection" },
  { id: "c007", question: "Where did you spend energy today that you want to reclaim tomorrow?", category: "growth" },
  { id: "c008", question: "Who made today lighter for you, even in a small way?", category: "gratitude" },
  { id: "c009", question: "What truth have you been making harder than it needs to be?", category: "challenge" },
  { id: "c010", question: "What does your body seem to be asking you for right now?", category: "mindfulness" },
  { id: "c011", question: "What choice today felt most aligned with who you want to become?", category: "growth" },
  { id: "c012", question: "What did today reveal about what matters to you?", category: "reflection" },
  { id: "c013", question: "What ordinary part of your life would you miss if it disappeared tomorrow?", category: "gratitude" },
  { id: "c014", question: "Where would courage look like one small action, not a dramatic leap?", category: "challenge" },
  { id: "c015", question: "What can you notice right now without needing to change it?", category: "mindfulness" },
  { id: "c016", question: "What mistake taught you something useful this week?", category: "growth" },
  { id: "c017", question: "Which part of today deserves a second look instead of a quick judgment?", category: "reflection" },
  { id: "c018", question: "What support did you receive recently that you do not want to take for granted?", category: "gratitude" },
  { id: "c019", question: "What boundary would protect your attention tomorrow?", category: "challenge" },
  { id: "c020", question: "What are you carrying that can wait until tomorrow?", category: "mindfulness" },
  { id: "c021", question: "What pattern did you notice in yourself today?", category: "reflection" },
  { id: "c022", question: "What are you practicing, even if you are not good at it yet?", category: "growth" },
  { id: "c023", question: "What made you feel seen or understood recently?", category: "gratitude" },
  { id: "c024", question: "What would you do next if you trusted yourself ten percent more?", category: "challenge" },
  { id: "c025", question: "Which moment today asked you to slow down?", category: "mindfulness" },
  { id: "c026", question: "What are you proud of that no one else may have noticed?", category: "growth" },
  { id: "c027", question: "What expectation shaped your mood today?", category: "reflection" },
  { id: "c028", question: "What is working in your life that deserves more attention?", category: "gratitude" },
  { id: "c029", question: "What uncomfortable task would make tomorrow easier?", category: "challenge" },
  { id: "c030", question: "What feeling needs space rather than a solution tonight?", category: "mindfulness" },
  { id: "c031", question: "What did you say yes to today, and what did that yes cost?", category: "reflection" },
  { id: "c032", question: "What is one adjustment that would make tomorrow feel more intentional?", category: "growth" },
];

function promptForDate(date: Date): DailyPrompt {
  const year = date.getUTCFullYear();
  const dayOfYear = Math.floor(
    (Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  const prompt = CURATED_PROMPTS[dayOfYear % CURATED_PROMPTS.length];
  return { ...prompt, date: date.toISOString().slice(0, 10) };
}

/**
 * Get today's daily prompt
 * Rotates through prompts based on the current date
 */
export function getTodayPrompt(): DailyPrompt {
  return promptForDate(new Date());
}

/**
 * Get a specific prompt by date
 */
export function getPromptByDate(date: Date): DailyPrompt {
  return promptForDate(date);
}

/**
 * Get a random prompt
 */
export function getRandomPrompt(): DailyPrompt {
  const prompt = CURATED_PROMPTS[Math.floor(Math.random() * CURATED_PROMPTS.length)];
  return { ...prompt, date: new Date().toISOString().slice(0, 10) };
}

/**
 * Get prompt count
 */
export function getPromptCount(): number {
  return CURATED_PROMPTS.length;
}

export default CURATED_PROMPTS;

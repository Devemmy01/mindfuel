import { DAILY_TIPS } from "@/lib/dailyTips";

/**
 * Daily Fuel: the morning tip email and push. Each weekday has its own format
 * so the email feels different every day, and every item has a short title
 * that becomes the subject line (identical subjects get threaded together
 * and read as the same email). Items are picked per person and never repeat
 * until that person has seen the whole pool for that day's theme.
 */

export type FuelItem = { id: string; title: string; body: string; extra?: string };
export type FuelTheme = { key: ThemeKey; label: string; kicker: string; cta: string };
type ThemeKey = "reset" | "mindset" | "try" | "word" | "thanks" | "feelgood" | "slow";

/** Indexed by UTC weekday, Sunday = 0. */
export const THEMES: FuelTheme[] = [
  { key: "reset", label: "Sunday Reset", kicker: "Look back, then begin again", cta: "Answer today's question" },
  { key: "mindset", label: "Mindset Monday", kicker: "A thought to carry into the week", cta: "Answer today's question" },
  { key: "try", label: "Try-This Tuesday", kicker: "One small thing to try today", cta: "Answer today's question" },
  { key: "word", label: "Word for Wednesday", kicker: "A word worth knowing", cta: "Answer today's question" },
  { key: "thanks", label: "Thankful Thursday", kicker: "A little gratitude goes a long way", cta: "Answer today's question" },
  { key: "feelgood", label: "Feel-Good Friday", kicker: "Lighten up, you made it to Friday", cta: "Answer today's question" },
  { key: "slow", label: "Slow Saturday", kicker: "Permission to slow down", cta: "Answer it in one easy line" },
];

const items = (prefix: string, rows: Array<[string, string, string?]>): FuelItem[] =>
  rows.map(([title, body, extra], index) => ({ id: `${prefix}${index + 1}`, title, body, extra }));

const TRY = items("try", [
  ["Send the text you've been drafting", "That message you keep rewriting in your head? Send the simple version today. Clear and kind beats perfect."],
  ["A 10-minute phone-free walk", "Leave your phone behind for ten minutes and just walk. Notice three things you'd normally miss."],
  ["Compliment someone specifically", "Not \"nice job\", but what exactly they did well. Specific praise sticks for years."],
  ["Do the 2-minute task first", "Pick the smallest thing on your list and finish it before anything else. Momentum is a real thing."],
  ["Drink a glass of water before your coffee", "Tiny, boring, surprisingly good. Your morning self will thank you."],
  ["Write tomorrow's top 3 tonight", "Before bed, write the three things that would make tomorrow a win. Then let your brain off duty."],
  ["Ask a better question", "Swap \"How are you?\" for \"What's been the best part of your week?\" and watch the conversation change."],
  ["Tidy one surface", "Not the whole room. One desk, one shelf, one counter. Small order, big calm."],
  ["Say no to one small thing", "Practise a polite no on something low-stakes today. It gets easier when it matters."],
  ["Eat one meal without a screen", "Taste the food. Notice when you're full. That's it, that's the challenge."],
  ["Call instead of texting", "Pick someone you usually text and call them for five minutes. Voices hit different."],
  ["Write down one worry, then one next step", "Getting a worry onto paper shrinks it. Adding one tiny next step makes it movable."],
  ["Unfollow three accounts that drain you", "Your feed is your environment. Tidy it like you'd tidy your room."],
  ["Take the stairs and notice your breath", "A minute of movement, a minute of attention. Two wins, one staircase."],
  ["Learn one person's story", "Ask someone you see often, a colleague or a neighbour, one thing about where they're from."],
  ["Finish something you started", "A book chapter, an email, a half-done chore. Closing loops frees up headspace."],
  ["Sit in silence for three minutes", "No music, no scrolling. Just sit and let your thoughts settle like a snow globe."],
  ["Write a thank-you note to your past self", "One sentence thanking past you for a choice that's helping you now."],
  ["Plan something to look forward to", "Even a small one: a walk on Saturday, a film on Friday. Anticipation is half the joy."],
  ["Stretch for five minutes", "Neck, shoulders, back. Your body has been holding today's stress for you."],
  ["Put one thing back where it belongs", "And then another. You're not cleaning, you're just being kind to future you."],
  ["Notice one thing you're proud of today", "Big or tiny. Say it out loud if you're brave."],
  ["Send a 'thinking of you' message", "No reason, no agenda. Those are the messages people remember."],
  ["Go to bed 20 minutes earlier", "Sleep is the cheapest upgrade there is."],
  ["Try a new route", "Walk, drive or ride a different way today. New routes wake up your attention."],
  ["Mute notifications for one hour", "Do one focused hour. The world will still be there."],
  ["Write three things that went right", "Today, before bed. Even on a hard day there are three."],
  ["Laugh at something on purpose", "Find the clip, the meme, the friend. Laughter is maintenance, not a luxury."],
  ["Ask for help with one thing", "It's not weakness, it's teamwork. Most people like being asked."],
  ["Spend five minutes outside", "Sunlight, air, sky. Five minutes is enough to reset."],
]);

const WORDS = items("word", [
  ["Ubuntu", "\"I am because we are.\" Our humanity is tied up in each other.", "From the Nguni Bantu languages of southern Africa. Who are you because of?"],
  ["Kaizen", "Continuous improvement through small, steady changes.", "Japanese. What's one 1% change you could make this week?"],
  ["Wabi-sabi", "Finding beauty in what's imperfect, unfinished and impermanent.", "Japanese. What imperfect thing in your life do you secretly love?"],
  ["Hygge", "A cosy, warm feeling of contentment, often shared with others.", "Danish. What makes a moment feel hygge to you?"],
  ["Sisu", "Quiet grit: the determination to keep going when things are hard.", "Finnish. Where did your sisu show up recently?"],
  ["Meraki", "Putting your soul, creativity or love into what you do.", "Greek. What do you do with meraki?"],
  ["Ikigai", "A reason for being; what makes life feel worth getting up for.", "Japanese. What gets you out of bed on a good day?"],
  ["Saudade", "A deep longing for someone or something you love that is far away.", "Portuguese. What do you feel saudade for?"],
  ["Lagom", "Not too much, not too little: just the right amount.", "Swedish. Where in your life do you need more lagom?"],
  ["Komorebi", "Sunlight filtering through the leaves of trees.", "Japanese. Some beauty is free if you look up."],
  ["Ataraxia", "A calm, untroubled state of mind.", "Ancient Greek. What brings you closest to it?"],
  ["Eudaimonia", "Flourishing: a life that feels well lived, not just pleasant.", "Ancient Greek. What does flourishing look like for you?"],
  ["Sankofa", "\"Go back and get it.\" Learning from the past to move forward.", "From the Akan people of Ghana. What from your past is worth going back for?"],
  ["Harambee", "\"All pull together.\" Working as one for the common good.", "Swahili. Who's on your harambee team?"],
  ["Friluftsliv", "\"Open-air life\": time spent outdoors as part of a good life.", "Norwegian. When did you last get some friluftsliv?"],
  ["Fika", "A pause for coffee or tea and conversation with others.", "Swedish. Who would you invite to fika today?"],
  ["Mudita", "Joy in someone else's happiness or success.", "From Pali, a Buddhist idea. Whose win can you celebrate today?"],
  ["Kintsugi", "Repairing broken pottery with gold, so the cracks become part of its beauty.", "Japanese. Which of your cracks became gold?"],
  ["Ichigo ichie", "\"One time, one meeting.\" Each encounter happens only once, so treasure it.", "Japanese. Who could you be more present with today?"],
  ["Sobremesa", "The time spent lingering at the table, talking, after a meal.", "Spanish. Who are your favourite sobremesa people?"],
  ["Arbejdsglæde", "Happiness at work: the joy of meaningful, enjoyable work.", "Danish. What part of your work gives you this?"],
  ["Hiraeth", "Homesickness for a home or a time you can't return to.", "Welsh. Where does your hiraeth live?"],
  ["Omoluabi", "A person of good character: honest, respectful and kind.", "Yoruba. Who is the most omoluabi person you know?"],
  ["Gigil", "That urge to squeeze something because it's just too cute.", "Filipino. What gives you gigil?"],
  ["Gezellig", "Cosy togetherness; the warm feeling of being with good people.", "Dutch. Where do you feel most gezellig?"],
  ["Mono no aware", "A gentle awareness that things pass, which makes them more precious.", "Japanese. What moment do you want to savour before it passes?"],
]);

const THANKS = items("thanks", [
  ["Thank someone who'll never expect it", "The bus driver, the cleaner, the friend who always shows up. A specific thank-you can make their week."],
  ["Gratitude for the boring stuff", "Running water, a working phone, a bed. Name one boring thing you'd hate to lose."],
  ["The teacher who shaped you", "Think of one teacher or mentor. What's the one thing they gave you that you still use?"],
  ["Thank your body", "Your legs carried you, your lungs kept going. Write one thank-you to the body that got you here."],
  ["A person who made a hard time lighter", "Who was there when it mattered? Maybe today's the day they hear it."],
  ["Three good things, right now", "Write three things you're grateful for before you reach the end of this email."],
  ["Gratitude for a lesson", "Some of the best lessons came wrapped in bad days. Which one are you grateful for now?"],
  ["Thank past you", "Something you did last month is making today easier. Give yourself credit."],
  ["Thank the place you live", "A street, a shop, a view, a neighbour. What do you love about where you are?"],
  ["Gratitude for a voice", "Whose voice do you love hearing? Call or voice-note them today."],
  ["A small luxury you're thankful for", "Good coffee, clean sheets, a playlist. Small joys count as big ones."],
  ["Thank a friend for a specific memory", "\"I still think about that time we...\" is one of the best messages you can send."],
  ["Gratitude for a skill", "What can you do now that you couldn't do five years ago? That's growth worth thanking."],
  ["Thank someone you disagree with", "They made you think harder. That's a gift, even when it doesn't feel like one."],
  ["The kindness of a stranger", "Remember a time a stranger helped you. Pay it forward once today."],
  ["Gratitude in one photo", "Take a photo of one thing you're grateful for today. Keep it as a reminder."],
  ["Thank the people behind your food", "Farmers, drivers, cooks. A lot of hands made your lunch possible."],
  ["Grateful for a second chance", "Think of a time you got a do-over. How did you use it?"],
  ["Gratitude for your people", "List the five people who'd answer at 2am. You're less alone than you think."],
  ["Thank yourself for showing up", "Some days just getting through is the win. Today, thank yourself for that."],
]);

const FEELGOOD = items("fg", [
  ["Your Friday soundtrack", "Put on the song that makes you dance like no one's watching. Then actually dance."],
  ["Main character energy, but kind", "Walk into today like the hero of a gentle film. Hold the door, smile first."],
  ["Laugh before lunch", "Find one thing that makes you laugh before midday. Send it to someone who needs it."],
  ["Celebrate a tiny win", "You replied to that email. You drank water. Fireworks are justified."],
  ["Plan a tiny treat", "Your favourite snack, a long shower, an episode guilt-free. You've earned it."],
  ["Friday debrief, the fun version", "What was the funniest thing that happened this week? Write it down before you forget."],
  ["Be someone's good news", "Send a meme, a compliment or a \"proud of you\". Be the notification people smile at."],
  ["Rate your week like a film", "Genre? Star rating? Best scene? Your week deserves a review."],
  ["Wear the thing", "The nice shirt, the good perfume. Don't save it for a special day; make today one."],
  ["Childhood joy, reloaded", "What did you love doing as a kid? Do a five-minute version of it this weekend."],
  ["Make a 'ta-da' list", "Not a to-do list. A list of everything you got done this week. Look at you."],
  ["Find the funny", "Something went wrong this week. Can you find the funny side yet?"],
  ["Text the group chat something nice", "Start a thread of everyone's best moment of the week."],
  ["Snack ranking time", "Rank your top three snacks of all time. This is important research."],
  ["Plot your weekend side quest", "One small adventure: a new café, a new walk, a new recipe."],
  ["Compliment yourself out loud", "Yes, out loud. Yes, it's awkward. Yes, it works."],
  ["Send a voice note instead", "Your laugh in a voice note beats any emoji."],
  ["The 'it's Friday' stretch", "Arms up, big sigh, shoulders down. Week: handled."],
]);

const SLOW = items("slow", [
  ["Do one thing slowly", "Make your tea, eat your breakfast, take your walk at half speed. Notice everything."],
  ["No alarm, no guilt", "If you can, let today start when it starts. Rest is part of the work."],
  ["A long lunch", "Sit down. Taste it. No rushing back to anything."],
  ["Read something on paper", "A book, a magazine, a letter. Ten pages, no scrolling."],
  ["Nap with intention", "Twenty minutes, phone away. It's not lazy, it's maintenance."],
  ["Sit with the sky", "Five minutes looking up at clouds or stars. Feel how big the world is."],
  ["Cook something simple", "No recipe pressure. Something warm, something easy, something yours."],
  ["Let something be unfinished", "The pile can wait until Monday. Today, you get to just be."],
  ["A walk with no destination", "Go out, turn whichever way feels right, come back when you're ready."],
  ["Unplug for an hour", "Phone in a drawer for one hour. See what your mind does with the space."],
  ["Listen to a whole album", "Start to finish, no skipping. Let it take you somewhere."],
  ["Water your plants, and yourself", "A glass of water for you, a splash for them. Both of you grow."],
  ["Visit a favourite place", "A park, a shop, a corner of your city. Go just because you like it."],
  ["Write without a point", "One paragraph about anything. No goal, no audience, just you."],
  ["Slow morning, soft music", "Put on something gentle while you get ready. Set the tone for the day."],
  ["Do nothing for five minutes", "Not meditation, not a technique. Just sit, and let the day be enough."],
  ["Spend time with someone, unhurried", "Coffee that runs long. A chat with nowhere to be."],
  ["Take a long shower or bath", "Let it be a little ritual. Wash the week off."],
]);

const RESET = items("reset", [
  ["Your week in one sentence", "If this week were a headline, what would it say?"],
  ["One win, one lesson", "Name one thing that went well this week and one thing you'd do differently."],
  ["What gave you energy?", "Look back: which moments filled you up, and which drained you? Do more of the first."],
  ["Who made your week better?", "Think of one person. Can you tell them before Monday?"],
  ["Set one intention", "Not a resolution. One word or sentence for the week ahead."],
  ["Clear the decks", "Ten minutes of tidying, inbox or room, so Monday you starts lighter."],
  ["What will you say no to?", "Protect next week by choosing one thing you won't take on."],
  ["Your week in three photos", "Scroll your camera roll. What three photos sum it up?"],
  ["What surprised you?", "Something you didn't see coming this week. What did it teach you?"],
  ["Rate your rest", "On a scale of 1 to 10, how rested are you? What would add one point next week?"],
  ["The smallest next step", "Pick a big goal and write the smallest next step for Monday."],
  ["Forgive the week", "Some things didn't go to plan. Let them go so they don't come with you into Monday."],
  ["What are you looking forward to?", "Find one thing in the week ahead to be excited about. If there isn't one, plan one."],
  ["Check in with your body", "How's your sleep, food and movement been? One small upgrade for next week."],
  ["A message to Monday-you", "Write one encouraging line to yourself for tomorrow morning."],
]);

const POOLS: Record<ThemeKey, FuelItem[]> = {
  reset: RESET,
  mindset: [],
  try: TRY,
  word: WORDS,
  thanks: THANKS,
  feelgood: FEELGOOD,
  slow: SLOW,
};

/** Monday draws from the curated tips plus screened, synced quotes. */
export function mindsetItems(extraTips: string[] = []): FuelItem[] {
  return [...new Set([...DAILY_TIPS, ...extraTips])].map((text) => ({
    id: `tip:${text}`,
    title: shorten(text, 60),
    body: text,
  }));
}

export function themeFor(date: Date) {
  return THEMES[date.getUTCDay()];
}

export function poolFor(theme: FuelTheme, extraTips: string[] = []) {
  return theme.key === "mindset" ? mindsetItems(extraTips) : POOLS[theme.key];
}

/** Deterministic pick from what this person hasn't seen; restarts the pool once it's used up. */
export function pickItem(pool: FuelItem[], seen: Set<string>, seed: string) {
  let available = pool.filter((item) => !seen.has(item.id));
  const exhausted = available.length === 0;
  if (exhausted) available = pool;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { item: available[hash % available.length], exhausted };
}

export function subjectFor(theme: FuelTheme, item: FuelItem) {
  return theme.key === "word" ? `${theme.label}: ${item.title}` : `${theme.label}: ${shorten(item.title, 60)}`;
}

/** A personal line about the reader's streak, or null when there's nothing kind to say. */
export function streakLine(streakDays: number | undefined, lastReflection: Date | string | null | undefined, now = new Date()) {
  const last = lastReflection ? new Date(lastReflection) : null;
  const daysSince = last ? Math.floor((now.getTime() - last.getTime()) / 86_400_000) : Infinity;
  const streak = streakDays || 0;
  if (streak > 1 && daysSince <= 1) return `You're on a ${streak}-day streak. Keep the flame lit today.`;
  if (streak === 1 && daysSince <= 1) return "Day 1 is done. Day 2 is one sentence away.";
  if (last && daysSince > 1 && daysSince <= 30) return "Your flame misses you. One honest sentence starts it again.";
  if (!last) return "Your first reflection takes about a minute. Today could be Day 1.";
  return null;
}

export function shorten(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 15)).replace(/[,.;:]$/, "")}…`;
}

export const ALL_FUEL_POOLS = POOLS;

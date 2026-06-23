export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  prompts?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  readTime: string;
  updatedAt: string;
  intro: string;
  sections: GuideSection[];
}

export const guides: Guide[] = [
  {
    slug: "daily-reflection-questions",
    title: "60 daily reflection questions for meaningful personal growth",
    seoTitle: "60 Daily Reflection Questions for Personal Growth",
    description:
      "Use these 60 daily reflection questions to understand your day, build self-awareness, make better decisions, and notice your personal growth.",
    eyebrow: "Reflection prompts",
    readTime: "9 min read",
    updatedAt: "2026-06-23",
    intro:
      "A useful reflection question does more than ask how your day went. It helps you notice what shaped you, name what you need, and carry one clear lesson forward. Choose one question—not ten—and answer it with a specific moment from your day.",
    sections: [
      {
        heading: "Questions to understand your day",
        paragraphs: [
          "Start here when the day feels like a blur. These prompts turn a list of events into a clearer picture of what mattered.",
        ],
        prompts: [
          "What moment from today keeps returning to my mind?",
          "When did I feel most present today?",
          "What gave me energy, and what drained it?",
          "What did I enjoy more than I expected?",
          "What felt harder than it needed to feel?",
          "What did I avoid today, and why?",
          "Where did I spend my attention deliberately?",
          "What was the emotional weather of my day?",
          "What small detail do I want to remember?",
          "If today had a title, what would it be?",
        ],
      },
      {
        heading: "Questions for self-awareness",
        paragraphs: [
          "Self-awareness grows when you look for patterns without putting yourself on trial. Be honest, but stay curious.",
        ],
        prompts: [
          "What emotion was I reluctant to admit today?",
          "What story was I telling myself about another person?",
          "When did I act from fear rather than from my values?",
          "What did I need but fail to ask for?",
          "What triggered a stronger reaction than the situation deserved?",
          "Where was I trying to impress instead of connect?",
          "What assumption influenced a decision I made?",
          "What boundary felt clear—or unclear—today?",
          "When did I feel most like myself?",
          "What pattern am I beginning to notice?",
        ],
      },
      {
        heading: "Questions for learning and better decisions",
        prompts: [
          "What did today teach me that I could not have learned in theory?",
          "What changed my mind recently?",
          "What mistake contains a useful lesson?",
          "What worked today, and why did it work?",
          "What would I do differently if this situation repeated tomorrow?",
          "Which decision am I postponing?",
          "What information do I actually need before deciding?",
          "Am I solving the real problem or the most visible one?",
          "What is the smallest useful next step?",
          "What advice would I give a friend in my position?",
        ],
      },
      {
        heading: "Questions for gratitude and perspective",
        prompts: [
          "What ordinary thing made life easier today?",
          "Who helped me, directly or indirectly?",
          "What ability did I use today that I once had to learn?",
          "What problem did I not have today?",
          "What part of my routine quietly supports me?",
          "What beauty did I almost miss?",
          "What am I taking for granted?",
          "Which past version of me would be proud of today?",
          "What is already enough in this moment?",
          "How did I contribute to someone else’s day?",
        ],
      },
      {
        heading: "Questions for relationships",
        prompts: [
          "Who did I feel close to today, and what created that feeling?",
          "Did I listen to understand or listen to reply?",
          "What conversation am I avoiding?",
          "Where could I be more generous in my interpretation?",
          "Did my actions match what I say I value in relationships?",
          "Who might need encouragement from me?",
          "What expectation have I left unspoken?",
          "When did I feel seen today?",
          "Where do I need to repair trust?",
          "What appreciation should I say out loud?",
        ],
      },
      {
        heading: "Questions to prepare for tomorrow",
        prompts: [
          "What deserves my best attention tomorrow?",
          "What can I release before the day ends?",
          "What would make tomorrow feel meaningful, even if it is imperfect?",
          "Which task will create the most relief?",
          "How can I make the right action easier to begin?",
          "What boundary will protect my energy?",
          "What do I want to practice rather than prove?",
          "Who do I want to be in tomorrow’s difficult moment?",
          "What is one promise I can realistically keep to myself?",
          "What lesson from today will I carry forward?",
        ],
      },
      {
        heading: "How to use a daily reflection question",
        paragraphs: [
          "Pick the question that creates a little tension or curiosity. Write for five minutes, ground your answer in one concrete example, and finish with a sentence beginning: “Tomorrow, I will…” A short honest answer repeated daily is more valuable than a perfect page written once.",
          "If you miss a day, continue with the day you are in. Reflection is a way to pay attention, not another streak you have to defend.",
        ],
      },
    ],
  },
  {
    slug: "how-to-reflect",
    title: "How to reflect: a practical five-minute method",
    seoTitle: "How to Reflect: A Practical 5-Minute Daily Method",
    description:
      "Learn how to reflect without overthinking. This simple five-minute reflection method turns daily experiences into self-awareness and useful action.",
    eyebrow: "Practical guide",
    readTime: "7 min read",
    updatedAt: "2026-06-23",
    intro:
      "Reflection is the practice of looking at an experience closely enough to learn from it. It is not replaying every mistake, forcing a positive lesson, or writing beautifully. Good reflection connects three things: what happened, what it meant to you, and what you will carry forward.",
    sections: [
      {
        heading: "The five-minute NOTICE method",
        paragraphs: [
          "Use this sequence when you want enough structure to begin but not so much that reflection becomes homework.",
        ],
        bullets: [
          "Name: Choose one moment rather than summarizing the whole day.",
          "Observe: Describe what happened without immediately judging it.",
          "Track: Notice your thoughts, emotions, body signals, and impulses.",
          "Interpret: Ask what the moment reveals about your needs, values, or patterns.",
          "Choose: Decide on one small response, experiment, or reminder for next time.",
          "End: Write one sentence that captures the lesson in plain language.",
        ],
      },
      {
        heading: "A worked reflection example",
        paragraphs: [
          "Moment: I stayed quiet in a meeting even though I saw a risk in the plan. Observation: I had the idea clearly, but my shoulders tightened when the discussion sped up. Meaning: I was waiting to feel completely certain before speaking. Choice: In the next meeting, I will ask one clarifying question instead of trying to deliver a perfect argument. Lesson: Courage can begin as curiosity.",
          "The value of this reflection is not its length. It turns a vague feeling—“meetings are stressful”—into a pattern you can recognize and an action you can test.",
        ],
      },
      {
        heading: "What to reflect on when nothing dramatic happened",
        paragraphs: [
          "Ordinary days are excellent material. Look for a shift in energy, a decision you made automatically, something you postponed, a conversation that lingered, or a small moment of ease. Personal growth is often hidden inside repeated details, not major events.",
        ],
        bullets: [
          "A moment that felt lighter or heavier than expected",
          "A choice you made quickly",
          "Something you envied, admired, or resisted",
          "A task that created surprising momentum",
          "An interaction that changed your mood",
        ],
      },
      {
        heading: "How to avoid overthinking",
        paragraphs: [
          "Set a short timer and separate observation from interpretation. First write what a camera could have recorded; then write what you thought and felt. This keeps assumptions from disguising themselves as facts.",
          "End with a small choice. If reflection leaves you circling the same question, ask: “What is one kind, testable action available to me?” You do not need to solve your whole life before bedtime.",
        ],
      },
      {
        heading: "A reusable daily reflection template",
        bullets: [
          "The moment I want to examine is…",
          "What happened, without judgment, was…",
          "I noticed myself thinking or feeling…",
          "This may matter because…",
          "Next time, I want to try…",
          "The lesson I am keeping is…",
        ],
      },
      {
        heading: "Make reflection a habit that survives real life",
        paragraphs: [
          "Attach reflection to something that already happens: closing your laptop, getting into bed, or drinking your first cup of tea. Keep the minimum version tiny—one moment, one lesson, one next step. On spacious days you can write more; on difficult days the minimum keeps the door open.",
          "Review several reflections once a week. A single entry captures a moment; a group of entries reveals a pattern. Look for repeated sources of energy, recurring friction, and promises you keep making to yourself.",
        ],
      },
    ],
  },
  {
    slug: "journaling-for-personal-growth",
    title: "Journaling for personal growth without turning it into homework",
    seoTitle: "Journaling for Personal Growth: A Simple Beginner’s Guide",
    description:
      "A practical beginner’s guide to journaling for personal growth, with simple methods, prompts, examples, and a sustainable weekly routine.",
    eyebrow: "Beginner’s guide",
    readTime: "8 min read",
    updatedAt: "2026-06-23",
    intro:
      "Personal growth journaling is useful when it helps you see your life more accurately and respond more deliberately. It becomes less useful when it turns into performance, endless self-analysis, or a daily test you can fail. The goal is not to produce pages. The goal is to notice, learn, and choose.",
    sections: [
      {
        heading: "What personal growth journaling can do",
        bullets: [
          "Make recurring thoughts and emotional patterns easier to recognize",
          "Create distance between an event and your first interpretation of it",
          "Preserve lessons that would otherwise disappear into a busy week",
          "Help you make decisions using your values rather than only your mood",
          "Show evidence of change that is difficult to notice day by day",
        ],
        paragraphs: [
          "A journal is not a substitute for professional mental health support. It is a thinking environment: a place where your experience can slow down enough to become understandable.",
        ],
      },
      {
        heading: "Choose a method that matches the moment",
        bullets: [
          "Daily check-in: one highlight, one difficulty, one lesson, and one next step.",
          "Decision journal: record the choice, your assumptions, expected outcome, and a date to review it.",
          "Pattern journal: track when a repeated emotion or behavior appears and what happened just before it.",
          "Gratitude with detail: describe why one specific thing mattered instead of listing three generic positives.",
          "Weekly review: scan the week for energy, friction, progress, relationships, and unfinished concerns.",
        ],
      },
      {
        heading: "A simple ten-minute routine",
        paragraphs: [
          "Spend two minutes arriving: put the phone away, take a breath, and name your current mood. Spend five minutes writing about one specific experience. Use the final three minutes to underline the sentence that feels most true and write one next action.",
          "Stop when the timer ends, even if the entry feels unfinished. A reliable ending makes it easier to return tomorrow.",
        ],
      },
      {
        heading: "Prompts that lead to useful insight",
        prompts: [
          "What am I learning about what gives me energy?",
          "Where are my actions out of step with my stated priorities?",
          "What am I making harder by waiting for certainty?",
          "Which recent moment revealed a value I care about?",
          "What do I need to accept before I can make a clear choice?",
          "What is improving that I have not paused to acknowledge?",
          "Which problem needs patience, and which one needs action?",
          "What would a smaller, sustainable version of this goal look like?",
        ],
      },
      {
        heading: "Common journaling traps",
        bullets: [
          "Summarizing every event: choose the moment with the most emotional or practical weight.",
          "Treating every feeling as a fact: write the feeling and then test the interpretation.",
          "Demanding a breakthrough: ordinary observations compound into insight over time.",
          "Only writing when life is difficult: record ease, joy, competence, and connection too.",
          "Never rereading: a short weekly review is where repeated patterns become visible.",
        ],
      },
      {
        heading: "A sustainable weekly rhythm",
        paragraphs: [
          "Use short daily entries and one slightly longer weekly review. Ask what gave you energy, what created friction, what you learned, what you are avoiding, and what deserves attention next week. Choose one theme rather than making a long improvement list.",
          "If you stop journaling, return without reconstructing the missing days. The journal exists to support your life; your life does not exist to keep the journal complete.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

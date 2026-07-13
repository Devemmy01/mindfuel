/**
 * Original, practical Daily Fuel notes. These supplement the reflection
 * prompts and synced quote sources with advice that is concise and actionable.
 */
export const DAILY_TIPS = [
  "Choose one moment from yesterday and ask what it was trying to teach you.",
  "Before adding a new goal, decide what you are willing to do less of.",
  "When a task feels heavy, reduce it to the smallest action that creates movement.",
  "Name the emotion before you act on it. Clarity often begins with accurate language.",
  "Protect ten quiet minutes today. Insight needs somewhere to land.",
  "Write down one assumption you are making, then look for evidence that could change it.",
  "Notice what gives you energy without demanding attention. That is useful data.",
  "A missed day is not a broken habit. Return with the day you have.",
  "Ask one sincere follow-up question in your next conversation.",
  "Replace 'I should have known' with 'Now I know.' Growth needs room for hindsight.",
  "Make one promise to yourself small enough that you can keep it today.",
  "If everything feels urgent, choose the action that will create the most relief tomorrow.",
  "Pause before solving someone else's problem. They may need to feel understood first.",
  "Your first interpretation is a possibility, not always the truth.",
  "Record one ordinary thing that made today easier. Gratitude becomes real in the details.",
  "Do not wait for perfect confidence. Begin with one curious question.",
  "Rest is not a reward for exhaustion; it is part of doing meaningful work well.",
  "When you feel stuck, change the question from 'Why am I like this?' to 'What do I need?'.",
  "Leave a little space between finishing one thing and beginning the next.",
  "Review what worked before redesigning everything that did not.",
  "A boundary is clearest when it describes what you will do, not how others must behave.",
  "Let one good-enough decision free your attention for something that matters more.",
  "Pay attention to the moments when you feel most like yourself.",
  "Write the lesson in one sentence. If it is useful, it should be easy to carry.",
  "Before reacting, ask whether the situation needs speed, patience, or a conversation.",
  "Make the helpful choice easier: prepare the space, remove one obstacle, and start small.",
  "You can appreciate your progress without pretending the journey was easy.",
  "Choose consistency over intensity when you want a habit to survive real life.",
  "The thought you keep avoiding may contain the question worth reflecting on.",
  "Give your attention to one person or task fully for the next fifteen minutes.",
  "Separate what happened from the story you told yourself about what happened.",
  "Ask what a kinder interpretation would be without ignoring the facts.",
  "Celebrate evidence of change, especially when it looks small from the outside.",
  "If you need clarity, describe the decision in plain language before listing the options.",
  "Turn comparison into information: what exactly do you admire, and what can it teach you?",
  "A useful reflection ends with a choice, an experiment, or a reminder—not self-punishment.",
  "Notice where you are spending energy trying to control an outcome you can only influence.",
  "Say the appreciation while the moment is still alive.",
  "When motivation is low, rely on the environment and routine you prepared earlier.",
  "Revisit an old reflection and notice what has changed in you since you wrote it.",
  "Do one thing today that your future self will experience as care.",
  "Ask for what you need clearly enough that the other person does not have to guess.",
  "Slow progress is still information that your method is working.",
  "If a goal no longer fits your values, changing it is wisdom—not failure.",
  "Observe your strongest reaction today with curiosity before turning it into a conclusion.",
  "Create before you consume, even if what you create is only one honest sentence.",
  "Choose one unfinished concern and decide whether to act, schedule, delegate, or release it.",
  "Make room for joy that does not need to become productive.",
  "Your attention is a daily vote for the life you are building.",
  "End the day by naming one lesson you want to remember and one burden you can put down.",
  "Listen for the difference between needing more information and needing more courage.",
  "A calm response can still be firm, direct, and honest.",
  "Look for the pattern across several days instead of judging yourself by one difficult moment.",
  "When you cannot change the whole situation, improve the next five minutes.",
  "Write about the moment that surprised you; surprise often reveals an unseen expectation.",
  "Let your values decide what deserves a yes before your availability does.",
  "Ask what you would try if the goal were learning rather than proving yourself.",
  "Make your next step visible and specific enough to begin without another decision.",
  "A meaningful life is built in repeated ordinary choices, not only dramatic turning points.",
  "Before bed, thank the version of you that kept going today.",
] as const;

export function stableTipIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return length ? Math.abs(hash) % length : 0;
}

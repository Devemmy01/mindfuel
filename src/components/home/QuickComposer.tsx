"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Shuffle } from "lucide-react";
import { getRandomPrompt, getTodayPrompt, type DailyPrompt } from "@/lib/dailyPrompts";
import { loadDraft, saveDraft } from "@/lib/draft";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/Input";

const MAX_CHARS = 1000;

type PromptRef = Pick<DailyPrompt, "id" | "question">;

/**
 * The home page composer: today's prompt and an open text box, with no sign-in
 * in the way. Text is kept as a local draft and carried into the full composer.
 */
export default function QuickComposer({ initialPrompt }: { initialPrompt: PromptRef }) {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState<PromptRef>(initialPrompt);
  const [text, setText] = React.useState("");
  const [autoFocus, setAutoFocus] = React.useState(false);
  const helperId = React.useId();

  React.useEffect(() => {
    // The server picked the prompt by its own date; match the viewer's day.
    const today = getTodayPrompt();
    const draft = loadDraft();
    if (draft?.text && draft.promptId) {
      setPrompt({ id: draft.promptId, question: draft.prompt || today.question });
      setText(draft.text);
    } else {
      setPrompt({ id: today.id, question: today.question });
    }
    // Focus straight into writing on desktop. On phones, opening the keyboard
    // on load would hide the value line, so the box waits for a tap.
    setAutoFocus(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const update = (value: string) => {
    setText(value);
    saveDraft({ text: value, prompt: prompt.question, promptId: prompt.id });
  };

  const shuffle = () => {
    let next = getRandomPrompt();
    if (next.id === prompt.id) next = getRandomPrompt();
    setPrompt({ id: next.id, question: next.question });
    if (text) saveDraft({ text, prompt: next.question, promptId: next.id });
  };

  const continueWriting = (event: React.FormEvent) => {
    event.preventDefault();
    saveDraft({ text, prompt: prompt.question, promptId: prompt.id });
    router.push(`/create?prompt=${encodeURIComponent(prompt.question)}&promptId=${encodeURIComponent(prompt.id)}`);
  };

  const count = text.length;

  return (
    <form id="write" onSubmit={continueWriting} className="scroll-mt-20 rounded-card border border-line bg-surface p-4 shadow-e1 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-micro font-semibold uppercase tracking-wider text-primary-text">Today&apos;s prompt</p>
        <button
          type="button"
          onClick={shuffle}
          className="-mr-1 -mt-1 inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-micro font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Shuffle className="size-3.5" aria-hidden />
          Different prompt
        </button>
      </div>
      <h2 className="mt-1.5 text-h3 text-foreground" id="write-prompt">{prompt.question}</h2>

      <Textarea
        aria-labelledby="write-prompt"
        aria-describedby={helperId}
        autoFocus={autoFocus}
        autoResize
        maxRows={10}
        value={text}
        onChange={(event) => update(event.target.value.slice(0, MAX_CHARS))}
        placeholder={copy.composer.placeholderWithPrompt}
        className="mt-3 min-h-28 bg-background"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p id={helperId} className="text-caption text-muted-foreground">
          {copy.composer.helper}{" "}
          <span className="tabular-nums text-subtle-foreground">{count > 0 ? `${count}/${MAX_CHARS}` : null}</span>
        </p>
        <Button type="submit" disabled={!text.trim()}>
          Continue <ArrowRight aria-hidden />
        </Button>
      </div>
      <p className="mt-2 text-micro text-subtle-foreground">
        No account needed to write. Sign in with Google when you&apos;re ready to save it.
      </p>
    </form>
  );
}

"use client";

import React from "react";
import { Shuffle } from "lucide-react";
import Link from "next/link";
import type { DailyPrompt } from "@/lib/dailyPrompts";
import { fetchRandomPrompt } from "@/hooks/useTodayPrompt";
import { loadDraft, saveDraft } from "@/lib/draft";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/Input";
import VisibilityToggle from "@/components/reflect/VisibilityToggle";
import ReflectionSavedPanel from "@/components/reflect/ReflectionSavedPanel";
import { useSubmitReflection, type ReflectionSaved } from "@/hooks/useSubmitReflection";
import type { PostVisibility } from "@/lib/post-visibility";
import { track, trackOnce } from "@/lib/analytics";

const MAX_CHARS = 1000;

type PromptRef = Pick<DailyPrompt, "id" | "question">;

/**
 * The home page composer: today's prompt and an open text box, with no sign-in
 * in the way. Saving signs the guest in, then posts the kept draft once.
 */
export default function QuickComposer({
  initialPrompt,
  variant = "home",
  onSaved,
}: {
  initialPrompt: PromptRef;
  /** `app`: signed-in Home card; hands the result to `onSaved` instead of the full success screen. */
  variant?: "home" | "app";
  onSaved?: (result: ReflectionSaved) => void;
}) {
  const [prompt, setPrompt] = React.useState<PromptRef>(initialPrompt);
  const [text, setText] = React.useState("");
  const [visibility, setVisibility] = React.useState<PostVisibility>("private");
  const [saved, setSaved] = React.useState<ReflectionSaved | null>(null);
  const { submit, busy, status, error } = useSubmitReflection((result) => {
    if (onSaved) onSaved(result);
    else setSaved(result);
  });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const helperId = React.useId();

  // Text typed before hydration finished lives only in the DOM. Adopt it
  // before anything re-renders the controlled textarea, so it is never lost.
  React.useLayoutEffect(() => {
    const typed = textareaRef.current?.value;
    if (typed) setText(typed.slice(0, MAX_CHARS));
  }, []);

  React.useEffect(() => {
    const draft = loadDraft();
    if (draft?.text && draft.promptId && !textareaRef.current?.value) {
      setPrompt({ id: draft.promptId, question: draft.prompt || initialPrompt.question });
      setText(draft.text);
      if (draft.visibility) setVisibility(draft.visibility);
    }
    // Focus straight into writing on desktop. On phones, opening the keyboard
    // on load would hide the value line, so the box waits for a tap.
    // (autoFocus would only apply at mount, before this check can run.)
    if (window.matchMedia("(pointer: fine)").matches) textareaRef.current?.focus({ preventScroll: true });
    if (variant === "home") track("landing_view");
  }, []);

  // A cached page can carry yesterday's prompt across UTC midnight; follow the
  // parent's fresher one unless the person has started writing.
  const firstPrompt = React.useRef(initialPrompt.id);
  React.useEffect(() => {
    if (initialPrompt.id === firstPrompt.current || textareaRef.current?.value) return;
    firstPrompt.current = initialPrompt.id;
    setPrompt(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt.id]);

  const update = (value: string) => {
    if (!text && value) trackOnce("composer_first_keystroke");
    setText(value);
    saveDraft({ text: value, prompt: prompt.question, promptId: prompt.id, visibility });
  };

  const shuffle = async () => {
    try {
      const next = await fetchRandomPrompt(prompt.id);
      setPrompt({ id: next.id, question: next.question });
      if (text) saveDraft({ text, prompt: next.question, promptId: next.id, visibility });
    } catch {
      // Keep the current prompt.
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    void submit({ text, prompt: prompt.question, promptId: prompt.id, visibility });
  };

  const count = text.length;
  const fullEditorHref = `/create?prompt=${encodeURIComponent(prompt.question)}&promptId=${encodeURIComponent(prompt.id)}`;

  if (saved) {
    return (
      <div id="write" className="rounded-card border border-line bg-surface">
        <ReflectionSavedPanel result={saved} />
      </div>
    );
  }

  return (
    <form id="write" onSubmit={save} className="scroll-mt-20 rounded-card border border-line bg-surface p-4 shadow-e1 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-micro font-semibold uppercase tracking-wider text-primary-text">
          {variant === "app" ? "Today's reflection" : "Today's prompt"}
        </p>
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
        ref={textareaRef}
        autoResize
        maxRows={10}
        value={text}
        onChange={(event) => update(event.target.value.slice(0, MAX_CHARS))}
        onFocus={() => trackOnce("composer_focus")}
        disabled={busy}
        placeholder={copy.composer.placeholderWithPrompt}
        className="mt-3 min-h-28 bg-background"
      />

      <p id={helperId} className="mt-2 text-caption text-muted-foreground">
        {copy.composer.helper}{" "}
        <span className="tabular-nums text-subtle-foreground">{count > 0 ? `${count}/${MAX_CHARS}` : null}</span>
      </p>

      {error ? (
        <p role="alert" className="mt-3 rounded-control border border-destructive/30 bg-destructive/10 px-3 py-2 text-caption text-foreground">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <VisibilityToggle value={visibility} onChange={(next) => {
          setVisibility(next);
          if (text) saveDraft({ text, prompt: prompt.question, promptId: prompt.id, visibility: next });
        }} disabled={busy} />
        <Button type="submit" disabled={!text.trim()} loading={busy}>
          {status === "signing-in" ? "Signing in…" : busy ? copy.composer.submitting : "Save reflection"}
        </Button>
      </div>
      {visibility === "public" ? (
        <p className="mt-2 text-micro">
          <span className="text-subtle-foreground">Sharing with the community? Follow the{" "}
          <Link href="/terms#community-guidelines" className="underline-offset-4 hover:underline">community guidelines</Link>
          {" · "}
          <a href="mailto:hello@mind-fuel.app?subject=Report%20a%20problem" className="underline-offset-4 hover:underline">Report a problem</a></span>
        </p>
      ) : null}
      <p className="mt-3 text-micro text-subtle-foreground">
        {variant === "home" ? <>Free. You&apos;ll sign in with Google to save it; your text stays here.{" "}</> : null}
        <Link href={fullEditorHref} className="font-semibold text-muted-foreground underline-offset-4 hover:underline">
          Open the full editor
        </Link>
      </p>
    </form>
  );
}

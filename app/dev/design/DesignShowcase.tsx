"use client";

import React from "react";
import { Bell, Bookmark, Heart, PenLine, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import IconButton from "@/components/ui/IconButton";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { Badge, Chip } from "@/components/ui/Badge";
import { Tabs, tabPanelProps } from "@/components/ui/Tabs";
import Dialog from "@/components/ui/Dialog";
import Tooltip from "@/components/ui/Tooltip";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="mb-4 text-caption font-semibold uppercase tracking-wider text-subtle-foreground">{title}</h2>
      {children}
    </section>
  );
}

const SWATCHES = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["surface-raised", "bg-surface-raised"],
  ["surface-elevated", "bg-surface-elevated"],
  ["border", "bg-line"],
  ["primary", "bg-primary"],
  ["destructive", "bg-destructive"],
] as const;

export default function DesignShowcase({ theme }: { theme: string }) {
  const [tab, setTab] = React.useState<"prompt" | "everything">("prompt");
  const [dialog, setDialog] = React.useState<null | "modal" | "sheet">(null);
  const [chip, setChip] = React.useState("Gratitude");
  const prefix = `ds-${theme}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-2">
        <p className="text-caption font-semibold text-primary-text">MindFuel design system</p>
        <h1 className="text-h1">{theme === "dark" ? "Dark" : "Light"} theme</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">Tokens and primitives. Development only.</p>
      </header>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SWATCHES.map(([name, className]) => (
            <div key={name} className="overflow-hidden rounded-control border border-line">
              <div className={`h-12 ${className}`} />
              <p className="bg-surface px-2 py-1.5 text-micro text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
          <span className="text-foreground">foreground</span>
          <span className="text-muted-foreground">muted</span>
          <span className="text-subtle-foreground">subtle</span>
          <span className="text-primary-text">primary text</span>
          <span className="text-destructive">danger</span>
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-2">
          <p className="text-display">Display 36</p>
          <p className="text-h1">Heading 1 · 28</p>
          <p className="text-h2">Heading 2 · 22</p>
          <p className="text-h3">Heading 3 · 18</p>
          <p className="text-body">Body 16. Write one honest reflection a day. Read what others learned.</p>
          <p className="text-body-sm text-muted-foreground">Body small 15 for secondary copy.</p>
          <p className="text-caption text-muted-foreground">Caption 13 · 2h ago</p>
          <p className="text-micro text-subtle-foreground tabular-nums">Micro 12 · 1,204 views</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button><PenLine /> Reflect</Button>
          <Button variant="secondary">Browse</Button>
          <Button variant="ghost">Not now</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="link">How it works</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <Tooltip content="Like">
            <IconButton aria-label="Like"><Heart className="size-5" /></IconButton>
          </Tooltip>
          <Tooltip content="Save to your collection">
            <IconButton aria-label="Save"><Bookmark className="size-5" /></IconButton>
          </Tooltip>
          <IconButton aria-label="Search" variant="secondary"><Search className="size-5" /></IconButton>
          <IconButton aria-label="Write a reflection" variant="primary"><PenLine className="size-5" /></IconButton>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="space-y-4">
          <Field label="Search" hideLabel>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="Search people and hashtags" />}
          </Field>
          <Field label="Your reflection" hint="A sentence or two is enough.">
            {({ id, describedBy }) => (
              <Textarea id={id} aria-describedby={describedBy} autoResize placeholder="What did today teach you?" />
            )}
          </Field>
          <Field label="Username" error="Usernames can only use letters, numbers, dots and underscores.">
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} defaultValue="ada lovelace" />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Card, avatar, badges">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar name="Ada Okafor" size="md" />
              <div>
                <CardTitle className="text-body-sm">Ada Okafor</CardTitle>
                <CardDescription>@ada · 2h</CardDescription>
              </div>
            </div>
            <Badge tone="accent">Today&apos;s prompt</Badge>
          </CardHeader>
          <p className="text-body">I learned that rest is part of the work, not a break from it.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>#growth</Badge>
            <Badge tone="danger">Reported</Badge>
            <Badge tone="count">3</Badge>
          </div>
        </Card>
        <div className="mt-3 flex items-end gap-2">
          <Avatar name="Ada Okafor" size="xs" />
          <Avatar name="Ben" size="sm" />
          <Avatar name="Chi Nwosu" size="md" />
          <Avatar name="Dee" size="lg" />
          <Avatar name="Efe Musa" size="xl" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Gratitude", "Growth", "Challenge"].map((label) => (
            <Chip key={label} selected={chip === label} onClick={() => setChip(label)}>{label}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Tabs">
        <Card padded={false}>
          <Tabs
            label="Feed"
            idPrefix={prefix}
            value={tab}
            onChange={setTab}
            showDescription
            items={[
              { value: "prompt", label: "Prompt answers", description: "Reflections written in reply to a daily prompt." },
              { value: "everything", label: "Everything", description: "All reflections and reposts, people you follow first." },
            ]}
          />
          <div {...tabPanelProps(tab, prefix)} className="p-4 text-body-sm text-muted-foreground">
            Panel: {tab}
          </div>
        </Card>
      </Section>

      <Section title="Empty state">
        <Card>
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Tap the bookmark on any reflection to keep it here."
            action={<Button variant="secondary">Browse reflections</Button>}
          />
        </Card>
      </Section>

      <Section title="Skeleton">
        <Card>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </Card>
      </Section>

      <Section title="Modal and sheet">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDialog("modal")}>Open modal</Button>
          <Button variant="secondary" onClick={() => setDialog("sheet")}>Open bottom sheet</Button>
        </div>
        <Dialog
          open={dialog !== null}
          onClose={() => setDialog(null)}
          presentation={dialog === "sheet" ? "sheet" : "auto"}
          title="Turn on reminders?"
          description="A daily reminder at the time you choose. You can change this any time."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>Not now</Button>
              <Button onClick={() => setDialog(null)}><Bell /> Turn on</Button>
            </>
          }
        >
          <p className="text-body-sm text-muted-foreground">Escape, the close button and the backdrop all dismiss it. Focus is trapped inside.</p>
        </Dialog>
      </Section>

      <Section title="Toast">
        <div className="relative h-20 overflow-hidden rounded-card border border-dashed border-line [transform:translateZ(0)]">
          <Toast type="success" message={<span className="inline-flex items-center gap-1.5"><Sparkles className="size-4" aria-hidden /> Saved. Day 1 started.</span>} onClose={() => undefined} action={{ label: "Undo", onClick: () => undefined }} />
        </div>
      </Section>
    </main>
  );
}

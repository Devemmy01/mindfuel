"use client";

import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Bell, BellOff, Laptop, Smartphone, Trash2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import IconButton from "@/components/ui/IconButton";
import Switch from "@/components/ui/Switch";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ReminderPrimer from "@/components/reflect/ReminderPrimer";
import { CATEGORIES, CATEGORY_LABELS, type NotificationSettings } from "@/lib/notification-policy";
import { notificationPermission, pushSupport } from "@/lib/push-priming";

type Device = { id: string; userAgent: string | null; platform: string | null; createdAt: string | null; lastSeen: string | null };
type Payload = { settings: NotificationSettings; devices: Device[] };

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function hourLabel(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function deviceName(device: Device) {
  const agent = device.userAgent || "";
  const browser = /Edg\//.test(agent) ? "Edge" : /SamsungBrowser/.test(agent) ? "Samsung Internet" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : /Firefox\//.test(agent) ? "Firefox" : "Browser";
  const os = /iPhone|iPad/.test(agent) ? "iPhone/iPad" : /Android/.test(agent) ? "Android" : /Mac OS X/.test(agent) ? "Mac" : /Windows/.test(agent) ? "Windows" : device.platform || "Device";
  return `${browser} on ${os}`;
}

function DeniedHelp() {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const steps = /iPhone|iPad/.test(agent)
    ? "Open iPhone Settings → Notifications → MindFuel, then turn on Allow Notifications."
    : /Android/.test(agent)
      ? "In Chrome, tap the icon left of the address bar → Permissions → Notifications → Allow. For the installed app: long-press the icon → App info → Notifications."
      : "Click the icon left of the address bar → Site settings → Notifications → Allow, then reload.";
  return <p className="mt-2 text-caption text-muted-foreground">Notifications are blocked for MindFuel in this browser. {steps}</p>;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-5">
      <h2 className="text-body font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 text-caption text-muted-foreground">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function NotificationSettingsClient({ testPush }: { testPush: boolean }) {
  const { user, loading, openSignInModal, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [primerOpen, setPrimerOpen] = React.useState(false);
  const [permission, setPermission] = React.useState<string>("default");
  const [support, setSupport] = React.useState<string>("supported");
  const [timezones, setTimezones] = React.useState<string[]>([]);
  const { data, mutate, isLoading } = useSWR<Payload>(
    user ? `/api/users/notification-settings?u=${user.uid}` : null,
    (url: string) => fetch(url).then((response) => (response.ok ? response.json() : Promise.reject(response.status))),
  );

  React.useEffect(() => {
    setPermission(notificationPermission());
    setSupport(pushSupport());
    try {
      setTimezones((Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") || []);
    } catch {
      setTimezones([]);
    }
  }, [primerOpen]);

  const save = async (changes: Partial<NotificationSettings>) => {
    if (!data) return;
    const optimistic = {
      ...data,
      settings: {
        ...data.settings,
        ...changes,
        push: { ...data.settings.push, ...(changes.push || {}) },
        email: { ...data.settings.email, ...(changes.email || {}) },
      },
    };
    await mutate(optimistic, false);
    const response = await fetch("/api/users/notification-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }).catch(() => null);
    if (!response?.ok) {
      showToast("Couldn't save that change. Please try again.", "error");
      await mutate();
    }
  };

  const removeDevice = async (device: Device) => {
    const response = await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: device.id }),
    }).catch(() => null);
    if (response?.ok) {
      showToast("That device will no longer get notifications.", "success");
      void mutate();
    } else {
      showToast("Couldn't remove that device.", "error");
    }
  };

  const sendTest = async () => {
    const response = await fetch("/api/push/test", { method: "POST" }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (response?.ok) showToast(`Test sent to ${body.sent} device${body.sent === 1 ? "" : "s"}.`, "success");
    else showToast(body?.error || "Couldn't send a test notification.", "error");
  };

  const header = (
    <header className="sticky top-0 z-sticky flex h-14 items-center gap-1 border-b border-line bg-background/90 px-2 backdrop-blur-md">
      <IconButton aria-label="Back" onClick={() => history.back()}>
        <ArrowLeft className="size-5" />
      </IconButton>
      <h1 className="text-h3">Notifications</h1>
    </header>
  );

  if (!loading && !user) {
    return (
      <div className="mobile-content-offset">
        {header}
        <EmptyState
          icon={Bell}
          title="Sign in to manage notifications"
          description="Choose what MindFuel tells you about, and when."
          action={<Button onClick={openSignInModal}>Sign in</Button>}
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mobile-content-offset">
        {header}
        <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading settings">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const { settings, devices } = data;
  const quietOn = settings.quietStart !== null && settings.quietEnd !== null;

  return (
    <div className="mobile-content-offset">
      {header}

      <Section title="This device">
        {support === "ios-needs-install" ? (
          <p className="text-caption text-muted-foreground">
            On iPhone, notifications work once MindFuel is on your Home Screen: tap Share in Safari, then Add to Home Screen, and open it from there.
          </p>
        ) : support === "unsupported" ? (
          <p className="text-caption text-muted-foreground">This browser doesn&apos;t support notifications. You can still get email.</p>
        ) : permission === "granted" ? (
          <p className="flex items-center gap-2 text-body-sm"><Bell className="size-4 text-primary-text" aria-hidden /> Notifications are allowed on this device.</p>
        ) : permission === "denied" ? (
          <>
            <p className="flex items-center gap-2 text-body-sm"><BellOff className="size-4 text-muted-foreground" aria-hidden /> Notifications are off on this device.</p>
            <DeniedHelp />
          </>
        ) : (
          <Button variant="secondary" onClick={() => setPrimerOpen(true)}><Bell aria-hidden /> Turn on notifications</Button>
        )}
        {testPush && permission === "granted" ? (
          <Button variant="ghost" size="sm" className="mt-3" onClick={sendTest}>Send a test notification (staging)</Button>
        ) : null}
      </Section>

      <Section title="Daily reminder" description="Today's prompt, once a day, only if you haven't reflected yet.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-caption font-medium">
            Time
            <select
              className="h-11 rounded-control border border-line bg-surface-elevated px-3 text-body"
              value={settings.reminderHour}
              onChange={(event) => void save({ reminderHour: Number(event.target.value) })}
            >
              {HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-caption font-medium">
            Time zone
            <select
              className="h-11 rounded-control border border-line bg-surface-elevated px-3 text-body"
              value={settings.timezone}
              onChange={(event) => void save({ timezone: event.target.value })}
            >
              {(timezones.includes(settings.timezone) ? timezones : [settings.timezone, ...timezones]).map((zone) => (
                <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span id="skip-weekends" className="text-body-sm">Skip weekends</span>
          <Switch labelledBy="skip-weekends" checked={settings.skipWeekends} onChange={(skipWeekends) => void save({ skipWeekends })} />
        </div>
      </Section>

      <Section title="Quiet hours" description="No notifications during these hours, except messages if you keep those on.">
        <div className="flex items-center justify-between gap-3">
          <span id="quiet-hours" className="text-body-sm">Quiet hours</span>
          <Switch
            labelledBy="quiet-hours"
            checked={quietOn}
            onChange={(on) => void save(on ? { quietStart: 22, quietEnd: 7 } : { quietStart: null, quietEnd: null })}
          />
        </div>
        {quietOn ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(["quietStart", "quietEnd"] as const).map((key) => (
              <label key={key} className="flex flex-col gap-1.5 text-caption font-medium">
                {key === "quietStart" ? "From" : "Until"}
                <select
                  className="h-11 rounded-control border border-line bg-surface-elevated px-3 text-body"
                  value={settings[key] ?? 0}
                  onChange={(event) => void save({ [key]: Number(event.target.value) })}
                >
                  {HOURS.map((hour) => <option key={hour} value={hour}>{hourLabel(hour)}</option>)}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="What to notify you about">
        <div role="table" aria-label="Notification categories" className="divide-y divide-line">
          <div role="row" className="flex items-center gap-2 pb-2 text-micro font-semibold uppercase tracking-wider text-subtle-foreground">
            <span role="columnheader" className="flex-1">Category</span>
            <span role="columnheader" className="w-14 text-center">Push</span>
            <span role="columnheader" className="w-14 text-center">Email</span>
          </div>
          {CATEGORIES.map((category) => (
            <div role="row" key={category} className="flex items-center gap-2 py-2">
              <div role="cell" className="min-w-0 flex-1">
                <p id={`cat-${category}`} className="text-body-sm font-medium">{CATEGORY_LABELS[category].title}</p>
                <p className="text-caption text-muted-foreground">{CATEGORY_LABELS[category].description}</p>
              </div>
              <div role="cell">
                <Switch
                  label={`${CATEGORY_LABELS[category].title}: push`}
                  checked={settings.push[category]}
                  onChange={(value) => void save({ push: { [category]: value } as NotificationSettings["push"] })}
                />
              </div>
              <div role="cell">
                <Switch
                  label={`${CATEGORY_LABELS[category].title}: email`}
                  checked={settings.email[category]}
                  onChange={(value) => void save({ email: { [category]: value } as NotificationSettings["email"] })}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Home">
        <div className="flex items-center justify-between gap-3">
          <span id="show-tips" className="text-body-sm">Show the Mindful tip card</span>
          <Switch
            labelledBy="show-tips"
            checked={profile?.showTips !== false}
            onChange={async (showTips) => {
              await fetch("/api/users/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ showTips }),
              }).catch(() => undefined);
              void refreshProfile();
            }}
          />
        </div>
      </Section>

      <Section title="Devices receiving notifications">
        {devices.length === 0 ? (
          <p className="text-caption text-muted-foreground">No devices yet. Turn on notifications above on each phone or computer you use.</p>
        ) : (
          <ul className="divide-y divide-line">
            {devices.map((device) => {
              const Icon = /iPhone|iPad|Android/.test(device.userAgent || "") ? Smartphone : Laptop;
              return (
                <li key={device.id} className="flex items-center gap-3 py-2">
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium">{deviceName(device)}</p>
                    <p className="text-caption text-muted-foreground">
                      {device.lastSeen ? `Active ${new Date(device.lastSeen).toLocaleDateString()}` : "Added earlier"}
                    </p>
                  </div>
                  <IconButton aria-label={`Remove ${deviceName(device)}`} onClick={() => void removeDevice(device)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <p className="px-4 py-5 text-caption text-muted-foreground">
        Every email has a one-tap unsubscribe link.{" "}
        <Link href="/privacy" className="font-semibold text-foreground underline-offset-4 hover:underline">How we use your data</Link>
      </p>

      <ReminderPrimer
        open={primerOpen}
        onClose={() => {
          setPrimerOpen(false);
          void mutate();
        }}
      />
    </div>
  );
}

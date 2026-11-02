import type { Metadata } from "next";
import NotificationSettingsClient from "./NotificationSettingsClient";
import { testPushEnabled } from "@/lib/push-test";

export const metadata: Metadata = {
  title: "Notification settings",
  robots: { index: false, follow: false },
};

export default function NotificationSettingsPage() {
  return <NotificationSettingsClient testPush={testPushEnabled()} />;
}

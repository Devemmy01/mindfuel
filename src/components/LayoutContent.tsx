"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AppRail from "@/components/shell/AppRail";
import BottomTabBar from "@/components/shell/BottomTabBar";
import FirstRunCoachmark from "@/components/shell/FirstRunCoachmark";
import ServiceWorkerBridge from "@/components/shell/ServiceWorkerBridge";
import { checkDayTwoReturn } from "@/lib/analytics";
import { ShellDataProvider } from "@/components/shell/useShellData";
import RailGuestCard from "@/components/shell/RailGuestCard";
import TodayPromptCard from "@/components/shell/TodayPromptCard";
import RailFooter from "@/components/shell/RailFooter";
import SearchUsers from "@/components/SearchUsers";
import MindfulTip from "@/components/MindfulTip";
import SuggestedConnections from "@/components/SuggestedConnections";
import TrendingHashtags from "@/components/TrendingHashtags";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isConversationOpen, setIsConversationOpen] = React.useState(false);
  const isMessages = pathname === "/messages";

  // MessagesClient announces when a thread is open so the tab bar can step
  // aside for the message composer on phones.
  React.useEffect(() => {
    const onConversationState = (event: Event) => {
      setIsConversationOpen(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    };
    window.addEventListener("mindfuel:conversation-state", onConversationState);
    return () => window.removeEventListener("mindfuel:conversation-state", onConversationState);
  }, []);
  React.useEffect(() => {
    if (!pathname.startsWith("/messages")) setIsConversationOpen(false);
  }, [pathname]);
  React.useEffect(() => checkDayTwoReturn(), []);

  // Internal tooling pages render without the app shell.
  if (pathname.startsWith("/dev/")) return <>{children}</>;

  // Public pages with their own header and footer render without the app shell.
  const isStandalonePage =
    pathname === "/" || pathname === "/about" || pathname === "/unsubscribe" || pathname === "/tip/download" || pathname.startsWith("/guides");
  if (isStandalonePage) return <>{children}</>;

  const hideTabBar = pathname === "/create" || pathname.startsWith("/chat") || (isMessages && isConversationOpen);

  return (
    <ShellDataProvider>
      <div className="app-shell relative flex h-dvh justify-center overflow-hidden bg-background text-foreground selection:bg-primary/20">
        <div
          className={`relative flex h-full w-full ${
            isMessages ? "md:max-w-[1180px] xl:max-w-[1320px]" : "md:max-w-[700px] lg:max-w-[860px] xl:max-w-[1240px]"
          }`}
        >
          <AppRail />

          <main
            className={`app-main no-scrollbar h-full w-full min-w-0 flex-grow md:border-x md:border-line ${
              isMessages ? "overflow-hidden md:max-w-none" : "overflow-y-auto md:max-w-[600px]"
            }`}
          >
            {children}
          </main>

          {!isMessages ? (
            <aside
              aria-label="Discover"
              className="no-scrollbar hidden h-full w-[340px] shrink-0 flex-col gap-4 overflow-y-auto pb-8 pl-6 pr-2 pt-3 xl:flex"
            >
              <SearchUsers />
              <RailGuestCard />
              <TodayPromptCard />
              <TrendingHashtags />
              <SuggestedConnections />
              <MindfulTip />
              <RailFooter />
            </aside>
          ) : null}
        </div>
      </div>
      <BottomTabBar hidden={hideTabBar} />
      <FirstRunCoachmark />
      <ServiceWorkerBridge />
    </ShellDataProvider>
  );
}

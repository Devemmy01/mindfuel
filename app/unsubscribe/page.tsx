import type { Metadata } from "next";
import UnsubscribeClient from "./UnsubscribeClient";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { CATEGORY_LABELS } from "@/lib/notification-policy";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const verified = verifyUnsubscribeToken(token);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <UnsubscribeClient
        token={verified ? token! : null}
        categoryTitle={verified ? CATEGORY_LABELS[verified.category].title : null}
      />
    </main>
  );
}

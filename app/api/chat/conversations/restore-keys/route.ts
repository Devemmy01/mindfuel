import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import Conversation from "@/models/conversation";
import User from "@/models/user";
import { requireFirebaseUser } from "@/lib/firebase-admin";

type IncomingRow = { user?: unknown; firebaseId?: unknown; wrappedKey?: unknown };

/**
 * Puts back key sets a conversation used before an unlinked device replaced
 * its key (see scripts/rescue-chat-keys.js). The rows are the wrapped keys an
 * old, never-reloaded tab still holds in memory: each is only openable by the
 * participant it was wrapped for, so the server learns nothing new. Key sets
 * are only ever appended to previousKeys; the current key and messages are
 * untouched, and a set that doesn't belong just fails to decrypt anything.
 */
export async function POST(req: NextRequest) {
  const auth = await requireFirebaseUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { conversationId, keySets } = await req.json();
    if (typeof conversationId !== "string" || !Array.isArray(keySets) || keySets.length > 50) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    await connectToDB();
    const user = await User.findOne({ firebaseId: auth.uid }).select("_id");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const conversation = await Conversation.findOne({ _id: conversationId, participants: user._id });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const participants = await User.find({ _id: { $in: conversation.participants } }).select("_id firebaseId");
    const resolve = (row: IncomingRow) => {
      const ref = row.user && typeof row.user === "object" ? (row.user as Record<string, unknown>) : null;
      const id = String(ref?._id ?? (typeof row.user === "string" ? row.user : ""));
      const firebaseId = String(ref?.firebaseId ?? row.firebaseId ?? "");
      return participants.find((p) => String(p._id) === id || (firebaseId && p.firebaseId === firebaseId));
    };

    const setId = (rows: Array<{ user: unknown; wrappedKey: string }>) =>
      rows.map((row) => `${String(row.user)}:${row.wrappedKey}`).sort().join("|");
    const known = new Set([
      setId(conversation.encryptedKeys || []),
      ...(conversation.previousKeys || []).map((p: { encryptedKeys: Array<{ user: unknown; wrappedKey: string }> }) => setId(p.encryptedKeys)),
    ]);

    const additions: Array<{ encryptedKeys: Array<{ user: unknown; wrappedKey: string }>; retiredAt: Date }> = [];
    for (const set of keySets) {
      if (!Array.isArray(set) || !set.length || set.length > participants.length) continue;
      const rows = [];
      for (const row of set as IncomingRow[]) {
        const participant = resolve(row);
        if (!participant || typeof row.wrappedKey !== "string" || row.wrappedKey.length > 1000) break;
        rows.push({ user: participant._id, wrappedKey: row.wrappedKey });
      }
      if (rows.length !== set.length) continue;
      const id = setId(rows);
      if (known.has(id)) continue;
      known.add(id);
      additions.push({ encryptedKeys: rows, retiredAt: new Date() });
    }

    if (additions.length) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $push: { previousKeys: { $each: additions } } },
      );
    }
    return NextResponse.json({ restored: additions.length });
  } catch (error) {
    console.error("Restoring conversation keys failed", error);
    return NextResponse.json({ error: "Failed to restore keys" }, { status: 500 });
  }
}

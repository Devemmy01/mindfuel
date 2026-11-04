// Restores lost conversation keys from a database backup.
//
// Before the fix in fix/chat-rekey-wipes-history, an unlinked device could
// replace a conversation's key, discarding the old one; every message sent
// under it became unreadable. Messages are still in the database as
// ciphertext, so putting the old key set back makes them readable again.
//
// This copies `encryptedKeys` (and any `previousKeys`) from the same
// conversation in one or more backups into the live conversation's
// `previousKeys`. It never touches `encryptedKeys` or any message. Requires
// the fix to be deployed, since older app versions ignore `previousKeys`.
//
// Usage (dry run by default; add --apply to write):
//   LIVE_URI="mongodb+srv://…/prod-db" \
//   node scripts/restore-chat-keys.mjs --a nuelwritescode --b paulamagbegor \
//     "mongodb+srv://…/restored-from-snapshot-1" "mongodb+srv://…/snapshot-2" [--apply]
//
// Each backup URI must include the database name (the same one production uses).
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args.splice(index, 2)[1];
};
const usernameA = flag("a");
const usernameB = flag("b");
const apply = args.includes("--apply");
const backupUris = args.filter((arg) => arg !== "--apply");
const liveUri = process.env.LIVE_URI;

if (!liveUri || !usernameA || !usernameB || !backupUris.length) {
  console.error("Usage: LIVE_URI=… node scripts/restore-chat-keys.mjs --a <username> --b <username> <backupUri>… [--apply]");
  process.exit(1);
}

async function findConversation(db) {
  const users = await db.collection("users").find({ username: { $in: [usernameA, usernameB] } }).project({ _id: 1, username: 1 }).toArray();
  if (users.length !== 2) throw new Error(`Expected both users, found: ${users.map((u) => u.username).join(", ") || "none"}`);
  const participantKey = users.map((u) => String(u._id)).sort().join(":");
  return db.collection("conversations").findOne({ participantKey });
}

const keySetId = (set) => (set || []).map((row) => `${row.user}:${row.wrappedKey}`).sort().join("|");

const live = new MongoClient(liveUri);
await live.connect();
try {
  const liveDb = live.db();
  const conversation = await findConversation(liveDb);
  if (!conversation) throw new Error("Conversation not found in the live database");

  const known = new Set([keySetId(conversation.encryptedKeys), ...(conversation.previousKeys || []).map((p) => keySetId(p.encryptedKeys))]);
  const recovered = [];

  for (const uri of backupUris) {
    const backup = new MongoClient(uri);
    await backup.connect();
    try {
      const old = await findConversation(backup.db());
      if (!old) {
        console.log(`[${new URL(uri).host}] conversation not in this backup`);
        continue;
      }
      const sets = [old.encryptedKeys, ...(old.previousKeys || []).map((p) => p.encryptedKeys)].filter((s) => s?.length);
      for (const set of sets) {
        const id = keySetId(set);
        if (known.has(id)) continue;
        known.add(id);
        recovered.push({ encryptedKeys: set, retiredAt: old.updatedAt || new Date() });
      }
      console.log(`[${new URL(uri).host}] conversation updated ${old.updatedAt?.toISOString?.()}; ${sets.length} key set(s)`);
    } finally {
      await backup.close();
    }
  }

  console.log(`New key sets to restore: ${recovered.length}`);
  if (!recovered.length) process.exit(0);
  if (!apply) {
    console.log("Dry run. Re-run with --apply to write them to previousKeys.");
    process.exit(0);
  }
  // Append, keeping the current key and existing history first.
  await liveDb.collection("conversations").updateOne(
    { _id: conversation._id },
    { $push: { previousKeys: { $each: recovered } } },
  );
  console.log("Restored. Reload the chat in the browser to read the older messages.");
} finally {
  await live.close();
}

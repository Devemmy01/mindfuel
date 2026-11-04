// Rescue old chat keys from a MindFuel tab that still shows readable messages.
//
// When an unlinked device replaced a conversation's key, the old key was
// deleted from the database. A tab that loaded the chat *before* that, and
// hasn't been reloaded since, still holds the old wrapped keys in memory.
// This copies them out and uploads them to /api/chat/conversations/restore-keys
// so every linked device can read those messages again.
//
// HOW TO USE (on the old device, in the old tab — do NOT reload it):
//   1. Turn the device's network OFF first (Wi-Fi off / airplane mode), then
//      switch to the tab. The app re-fetches chats when the tab gains focus,
//      which would replace the old keys in memory.
//   2. Open DevTools → Console. (Android phone: USB + chrome://inspect on a
//      computer. iPhone: Safari → Develop menu on a Mac.)
//   3. Paste this whole file and press Enter. It prints what it found.
//   4. Turn the network back ON, wait a few seconds, then run:
//        await mfRescueUpload()
//   5. On your new device, reload Messages.
(() => {
  const host = [...document.querySelectorAll("body *")].find((node) =>
    Object.keys(node).some((key) => key.startsWith("__reactFiber$")));
  if (!host) return console.error("No React tree found. Is this the MindFuel Messages tab?");
  let root = host[Object.keys(host).find((key) => key.startsWith("__reactFiber$"))];
  while (root.return) root = root.return;

  const seen = new WeakSet();
  const byConversation = new Map(); // conversationId -> Map(setId -> rows)
  const record = (conversation) => {
    const rows = conversation.encryptedKeys
      .filter((row) => row && typeof row.wrappedKey === "string")
      .map((row) => ({
        user: row.user && typeof row.user === "object" ? { _id: row.user._id, firebaseId: row.user.firebaseId } : row.user,
        wrappedKey: row.wrappedKey,
      }));
    if (!rows.length) return;
    const id = rows.map((row) => row.wrappedKey).sort().join("|");
    if (!byConversation.has(conversation._id)) byConversation.set(conversation._id, { names: conversation.participants, sets: new Map() });
    byConversation.get(conversation._id).sets.set(id, rows);
  };
  const visit = (value, depth) => {
    if (!value || typeof value !== "object" || depth > 14 || seen.has(value)) return;
    seen.add(value);
    if (value instanceof Node || value === window) return;
    if (typeof value._id === "string" && Array.isArray(value.encryptedKeys)) record(value);
    if (value instanceof Map) { for (const item of value.values()) visit(item, depth + 1); return; }
    for (const key of Object.keys(value)) {
      if (key === "return" || key === "_owner" || key === "stateNode" || key === "alternate") continue;
      try { visit(value[key], depth + 1); } catch { /* getters may throw */ }
    }
  };
  const stack = [root];
  while (stack.length) {
    const fiber = stack.pop();
    visit(fiber.memoizedState, 0);
    visit(fiber.memoizedProps, 0);
    if (fiber.sibling) stack.push(fiber.sibling);
    if (fiber.child) stack.push(fiber.child);
  }

  const payload = [...byConversation.entries()].map(([conversationId, entry]) => ({
    conversationId,
    with: (entry.names || []).map((p) => p && p.username).filter(Boolean).join(", "),
    keySets: [...entry.sets.values()],
  }));
  window.mfRescuedKeys = payload;
  console.table(payload.map((row) => ({ conversation: row.with || row.conversationId, keySets: row.keySets.length })));
  console.log("Saved in window.mfRescuedKeys. Turn the network back on, then run: await mfRescueUpload()");

  window.mfRescueUpload = async () => {
    // Read the signed-in session Firebase keeps in IndexedDB and mint a fresh
    // ID token, since the one in memory may have expired while offline.
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("firebaseLocalStorageDb");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise((resolve, reject) => {
      const request = db.transaction("firebaseLocalStorage", "readonly").objectStore("firebaseLocalStorage").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const session = rows.find((row) => String(row.fbase_key || "").startsWith("firebase:authUser:"));
    if (!session) throw new Error("Not signed in on this tab");
    const apiKey = session.fbase_key.split(":")[2];
    const refreshed = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.value.stsTokenManager.refreshToken)}`,
    }).then((response) => response.json());
    if (!refreshed.id_token) throw new Error(`Could not refresh sign-in: ${JSON.stringify(refreshed)}`);

    for (const row of window.mfRescuedKeys) {
      const response = await fetch("/api/chat/conversations/restore-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${refreshed.id_token}` },
        body: JSON.stringify({ conversationId: row.conversationId, keySets: row.keySets }),
      });
      const result = await response.json().catch(() => ({}));
      console.log(row.with || row.conversationId, response.status, result);
    }
    console.log("Done. Reload Messages on your other devices.");
  };
})();

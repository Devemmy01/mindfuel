export function getUserHandle(user?: { name?: string; username?: string } | null) {
  const saved = user?.username?.trim().replace(/^@+/, "");
  if (saved) return saved.toLowerCase();

  const fromName = user?.name
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);

  return fromName || "member";
}

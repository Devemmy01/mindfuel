import type { Types } from "mongoose";
import Block from "@/models/block";

type Id = Types.ObjectId | string;

/** True when either person has blocked the other. */
export async function isBlockedBetween(a: Id, b: Id) {
  return Boolean(await Block.exists({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  }));
}

/** Everyone `userId` has blocked or been blocked by, as strings. */
export async function blockedUserIds(userId: Id) {
  const rows = (await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] })
    .select("blocker blocked")
    .lean()) as unknown as Array<{ blocker: Types.ObjectId; blocked: Types.ObjectId }>;
  const self = String(userId);
  return new Set(rows.map((row) => (String(row.blocker) === self ? String(row.blocked) : String(row.blocker))));
}

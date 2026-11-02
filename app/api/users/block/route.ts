import { NextRequest, NextResponse } from "next/server";
import { getViewerUid, unauthorized } from "@/lib/api-auth";
import { connectToDB } from "@/utils/database";
import Block from "@/models/block";
import Follow from "@/models/follow";
import User from "@/models/user";

type UserRow = { _id: unknown; firebaseId: string; name?: string; username?: string; image?: string };

async function people(viewerUid: string, targetUid: unknown) {
  if (typeof targetUid !== "string" || !targetUid || targetUid === viewerUid) return null;
  const [viewer, target] = await Promise.all([
    User.findOne({ firebaseId: viewerUid }).select("_id").lean() as Promise<{ _id: unknown } | null>,
    User.findOne({ firebaseId: targetUid }).select("_id").lean() as Promise<{ _id: unknown } | null>,
  ]);
  return viewer && target ? { viewer, target } : null;
}

/** GET: people I've blocked. `?userId=` instead answers whether a block exists either way. */
export async function GET(req: NextRequest) {
  const viewerUid = await getViewerUid(req);
  if (!viewerUid) return unauthorized();
  await connectToDB();
  const headers = { "Cache-Control": "private, no-store" };

  const targetUid = req.nextUrl.searchParams.get("userId");
  if (targetUid) {
    const pair = await people(viewerUid, targetUid);
    if (!pair) return NextResponse.json({ blockedByMe: false, blockedMe: false }, { headers });
    const [mine, theirs] = await Promise.all([
      Block.exists({ blocker: pair.viewer._id, blocked: pair.target._id }),
      Block.exists({ blocker: pair.target._id, blocked: pair.viewer._id }),
    ]);
    return NextResponse.json({ blockedByMe: Boolean(mine), blockedMe: Boolean(theirs) }, { headers });
  }

  const viewer = await User.findOne({ firebaseId: viewerUid }).select("_id").lean() as { _id: unknown } | null;
  if (!viewer) return unauthorized();
  const rows = await Block.find({ blocker: viewer._id })
    .sort({ createdAt: -1 })
    .populate("blocked", "firebaseId name username image")
    .lean() as unknown as Array<{ blocked: UserRow | null; createdAt: Date }>;
  return NextResponse.json({
    blocked: rows.filter((row) => row.blocked).map((row) => ({
      userId: row.blocked!.firebaseId,
      name: row.blocked!.name,
      username: row.blocked!.username,
      image: row.blocked!.image,
      since: row.createdAt,
    })),
  }, { headers });
}

/** POST { userId }: block. Also removes follows in both directions. */
export async function POST(req: NextRequest) {
  const viewerUid = await getViewerUid(req);
  if (!viewerUid) return unauthorized();
  await connectToDB();
  const { userId } = await req.json().catch(() => ({}));
  const pair = await people(viewerUid, userId);
  if (!pair) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

  await Block.updateOne(
    { blocker: pair.viewer._id, blocked: pair.target._id },
    { $setOnInsert: { blocker: pair.viewer._id, blocked: pair.target._id } },
    { upsert: true },
  );
  await Follow.deleteMany({
    $or: [
      { follower: pair.viewer._id, following: pair.target._id },
      { follower: pair.target._id, following: pair.viewer._id },
    ],
  });
  return NextResponse.json({ blocked: true });
}

/** DELETE { userId }: unblock. Follows are not restored. */
export async function DELETE(req: NextRequest) {
  const viewerUid = await getViewerUid(req);
  if (!viewerUid) return unauthorized();
  await connectToDB();
  const { userId } = await req.json().catch(() => ({}));
  const pair = await people(viewerUid, userId);
  if (!pair) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  await Block.deleteOne({ blocker: pair.viewer._id, blocked: pair.target._id });
  return NextResponse.json({ blocked: false });
}

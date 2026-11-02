/**
 * Review Mindful Tips.
 *
 *   npx tsx --env-file=.env.local scripts/review-tips.ts              # dry run: summary + flagged/pending list
 *   npx tsx --env-file=.env.local scripts/review-tips.ts --apply      # classify legacy tips (no status yet)
 *   npx tsx --env-file=.env.local scripts/review-tips.ts --approve <id> [<id>...]
 *   npx tsx --env-file=.env.local scripts/review-tips.ts --reject <id> [<id>...]
 *
 * --apply: screen-failing tips -> rejected; Advice Slip -> pending (needs a
 * person); everything else -> approved. Nothing is deleted.
 */
import mongoose from "mongoose";
import Tip from "../src/models/tip";
import { initialTipStatus, screenTip } from "../src/lib/tip-screen";

type Row = { _id: unknown; text: string; source: string; status?: string };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (use --env-file=.env.local)");
  await mongoose.connect(uri);
  const args = process.argv.slice(2);

  if (args[0] === "--approve" || args[0] === "--reject") {
    const status = args[0] === "--approve" ? "approved" : "rejected";
    const ids = args.slice(1);
    const result = await Tip.updateMany({ _id: { $in: ids } }, { $set: { status } });
    console.log(`${status}: ${result.modifiedCount} of ${ids.length}`);
    return;
  }

  const tips = (await Tip.find({}).select("text source status").lean()) as unknown as Row[];
  const byStatus = tips.reduce<Record<string, number>>((counts, tip) => {
    const key = tip.status || "legacy (unreviewed)";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  console.log("Tips by status:", byStatus);

  const flagged = tips.filter((tip) => !screenTip(tip.text).ok);
  console.log(`\nFailing the screen (${flagged.length}):`);
  for (const tip of flagged.slice(0, 200)) {
    const result = screenTip(tip.text);
    console.log(`  ${String(tip._id)}  [${tip.status || "legacy"}]  ${result.ok ? "" : result.reason}  ${tip.text}`);
  }
  const pending = tips.filter((tip) => tip.status === "pending" || (!tip.status && tip.source === "AdviceSlip"));
  console.log(`\nWaiting for review (${pending.length}). Approve with --approve <id>:`);
  for (const tip of pending.slice(0, 200)) console.log(`  ${String(tip._id)}  ${tip.text}`);

  if (args.includes("--apply")) {
    const legacy = tips.filter((tip) => !tip.status);
    let updated = 0;
    for (const tip of legacy) {
      const screened = screenTip(tip.text);
      await Tip.updateOne(
        { _id: tip._id },
        { $set: { status: initialTipStatus(tip.text, tip.source), ...(screened.ok ? {} : { screenReason: screened.reason }) } },
      );
      updated += 1;
    }
    console.log(`\nClassified ${updated} legacy tips.`);
  } else {
    console.log("\nDry run. Re-run with --apply to classify legacy tips.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

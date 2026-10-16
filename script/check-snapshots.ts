import "dotenv/config";
import { db } from "../server/db";
import { reportSnapshots } from "../shared/schema";

async function main() {
  const list = await db.select().from(reportSnapshots);
  console.log("Total snapshots in DB:", list.length);
  for (const s of list) {
    console.log(`- [${s.id}] [${s.scope}] ${s.title} (${s.periodLabel}) - Locked: ${s.isLocked}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error checking snapshots:", err);
  process.exit(1);
});

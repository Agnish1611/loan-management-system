import "dotenv/config";
import { connectDB, disconnectDB } from "@repo/database";
import { env } from "@/config/index.js";
import {
  seedService,
  CANONICAL_SEED_USERS,
  DEFAULT_SEED_PASSWORD,
} from "@/services/index.js";

async function main(): Promise<void> {
  console.log("--------------------------------------------------");
  console.log("  CreditSea LMS: Database Seeding Script");
  console.log("--------------------------------------------------");
  console.log(
    `Target Database: ${env.MONGO_URI.replace(/\/\/[^@]+@/, "//***:***@")}`,
  );

  await connectDB(env.MONGO_URI);

  const { seededCount, users } = await seedService.seed();

  console.log(`\nSuccessfully seeded ${seededCount} accounts:`);
  console.table(
    users.map((u) => {
      const def = CANONICAL_SEED_USERS.find((c) => c.email === u.email);
      return {
        Role: u.role,
        Email: u.email,
        Name: u.fullName,
        Description: def?.description ?? "",
      };
    }),
  );

  console.log(
    `\nDefault password for all seeded accounts: ${DEFAULT_SEED_PASSWORD}`,
  );
  console.log("--------------------------------------------------");
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seeding failed:", err);
    await disconnectDB();
    process.exit(1);
  });

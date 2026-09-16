import { app } from "@/app.js";
import { env } from "@/config/index.js";
import { connectDB, disconnectDB } from "@repo/database";

async function bootstrap() {
  try {
    await connectDB(env.MONGO_URI);
    console.log("[db] Connected to MongoDB");

    const server = app.listen(env.PORT, () => {
      console.log(
        `[server] LMS API listening on port ${env.PORT} in ${env.NODE_ENV} mode`,
      );
      console.log(`[server] Health check: http://localhost:${env.PORT}/health`);
    });

    const shutdown = async () => {
      console.log("Shutting down server...");
      server.close(async () => {
        await disconnectDB();
        console.log("Disconnected from MongoDB");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();

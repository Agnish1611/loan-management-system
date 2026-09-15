import "dotenv/config";
import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, () => {
  console.log(`🚀 LMS API server listening on http://localhost:${PORT}`);
  console.log(`👉 Health check available at http://localhost:${PORT}/health`);
});

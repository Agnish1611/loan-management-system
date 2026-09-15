import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const mongoUri =
    uri || process.env.MONGO_URI || "mongodb://localhost:27017/lms";

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    isConnected = true;
    return conn;
  } catch (error) {
    isConnected = false;
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

export { mongoose };

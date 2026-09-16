import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const mongoUri =
    uri || process.env.MONGO_URI || "mongodb://localhost:27017/lms";

  if (mongoose.connection.readyState === 1) {
    if (
      uri &&
      mongoose.connection.host &&
      !mongoUri.includes(mongoose.connection.host)
    ) {
      await mongoose.disconnect();
    } else {
      isConnected = true;
      return mongoose;
    }
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
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  isConnected = false;
}

export { mongoose };

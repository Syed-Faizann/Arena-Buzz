import mongoose from "mongoose";
import dns from "node:dns";

// Fix for Windows DNS querySrv ECONNREFUSED with mongodb+srv://
dns.setServers(["8.8.8.8", "8.8.4.4"]);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

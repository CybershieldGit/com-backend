import dns from "dns";
import mongoose from "mongoose";
import config from "./config.js";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

async function connectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('Database Connected Successfully');
  } catch (error) {
    console.error('Database Connection Error:', error.message);
    process.exit(1);
  }
}

export default connectDB;
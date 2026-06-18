import mongoose from 'mongoose';
import config from './config.js';

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
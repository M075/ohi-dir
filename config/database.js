import mongoose from 'mongoose';

let connected = false;

const connectDB = async () => {
  mongoose.set('strictQuery', false);
  mongoose.set('debug', true);

  if (connected) {
    console.log('MongoDB is already connected...');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    connected = true;
    console.log('MongoDB connected...');
    console.log(`Connected to database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
  } catch (error) {
    console.log('MongoDB connection error:', error);
  }
};

export default connectDB;
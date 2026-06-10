const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pdf_signer';
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // Don't exit the process — let Render restart handle it if needed
    // process.exit(1);
  }
};

module.exports = connectDB;

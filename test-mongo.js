const mongoose = require("mongoose");

require("dotenv").config();

async function testMongo() {
  try {
    console.log("Testing MongoDB connection...");

    if (!process.env.MONGO_URI) {
      console.log("MONGO_URI is missing");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log("================================");
    console.log("MONGODB CONNECTION SUCCESS");
    console.log("================================");

    await mongoose.disconnect();

    process.exit(0);

  } catch (error) {

    console.log("================================");
    console.log("MONGODB CONNECTION FAILED");
    console.log("NAME:", error.name);
    console.log("MESSAGE:", error.message);
    console.log("================================");

    process.exit(1);
  }
}

testMongo();
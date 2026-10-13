const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const ownerPassword = await bcrypt.hash(
      "Owner@123",
      10
    );

    const employeePassword = await bcrypt.hash(
      "Employee@123",
      10
    );

    await User.deleteMany({});

    await User.create([
      {
        name: "CA Anil Raghuvanshi",
        username: "owner",
        password: ownerPassword,
        role: "owner",
      },
      {
        name: "Employee",
        username: "employee",
        password: employeePassword,
        role: "employee",
      },
    ]);

    console.log(
      "Owner and employee created successfully"
    );

    await mongoose.disconnect();

  } catch (error) {
    console.error("SEED ERROR:", error);

    process.exit(1);
  }
}

seedUsers();
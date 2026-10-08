const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected");

        await User.deleteMany({});

        const ownerPassword = await bcrypt.hash("Owner@123", 10);
        const employeePassword = await bcrypt.hash("Employee@123", 10);

        await User.create({
            name: "CA Anil Raghuvanshi",
            username: "owner",
            password: ownerPassword,
            role: "owner"
        });

        await User.create({
            name: "Employee",
            username: "employee",
            password: employeePassword,
            role: "employee"
        });

        console.log("Users created successfully");

        console.log("Owner Login:");
        console.log("Username: owner");
        console.log("Password: Owner@123");

        console.log("Employee Login:");
        console.log("Username: employee");
        console.log("Password: Employee@123");

        process.exit(0);

    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

seedUsers();
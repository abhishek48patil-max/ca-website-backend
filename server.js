const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

require("dotenv").config();

const User = require("./models/User");
const Workload = require("./models/Workload");
const Consultation = require("./models/Consultation");

const {
  authenticateToken,
  requireOwner
} = require("./middleware/auth");

const app = express();


// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "https://curious-kitten-8b981e.netlify.app"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());


// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());


// =====================================================
// EMAIL CONFIGURATION
// =====================================================

const emailTransporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// Check email configuration when server starts
emailTransporter.verify((error) => {

  if (error) {

    console.error(
      "================================="
    );

    console.error(
      "EMAIL CONFIGURATION ERROR"
    );

    console.error(
      error.message
    );

    console.error(
      "================================="
    );

  } else {

    console.log(
      "Email service is ready"
    );

  }

});


// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {

  res.send(
    "CA Anil Raghuvanshi Backend Running"
  );

});


// =====================================================
// LOGIN
// =====================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        username,
        password
      } = req.body;


      // Check input
      if (!username || !password) {

        return res.status(400).json({
          message:
            "Username and password are required"
        });

      }


      // Clean username
      const cleanUsername =
        username.trim().toLowerCase();


      // Find user
      const user =
        await User.findOne({
          username: cleanUsername
        });


      if (!user) {

        return res.status(401).json({
          message:
            "Invalid username or password"
        });

      }


      // Compare password
      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );


      if (!passwordMatch) {

        return res.status(401).json({
          message:
            "Invalid username or password"
        });

      }


      // Create JWT
      const token =
        jwt.sign(
          {
            id: user._id.toString(),
            username: user.username,
            role: user.role
          },

          process.env.JWT_SECRET,

          {
            expiresIn: "8h"
          }
        );


      // Success
      return res.json({

        token,

        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          role: user.role
        }

      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Server error during login"
      });

    }

  }
);


// =====================================================
// CHECK CURRENT USER
// =====================================================

app.get(
  "/api/auth/me",
  authenticateToken,

  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user.id
        ).select("-password");


      if (!user) {

        return res.status(404).json({
          message:
            "User not found"
        });

      }


      return res.json(user);

    } catch (error) {

      console.error(
        "AUTH ME ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Server error"
      });

    }

  }
);


// =====================================================
// GET EMPLOYEES
// =====================================================

app.get(
  "/api/employees",
  authenticateToken,

  async (req, res) => {

    try {

      const employees =
        await User.find({
          role: "employee"
        })
        .select("-password")
        .sort({
          createdAt: -1
        });


      res.json(employees);

    } catch (error) {

      console.error(
        "GET EMPLOYEES ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch employees"
      });

    }

  }
);


// =====================================================
// CREATE EMPLOYEE
// =====================================================

app.post(
  "/api/employees",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const {
        name,
        username,
        password
      } = req.body;


      if (
        !name ||
        !username ||
        !password
      ) {

        return res.status(400).json({
          message:
            "Name, username and password are required"
        });

      }


      const cleanUsername =
        username.trim().toLowerCase();


      const existingUser =
        await User.findOne({
          username: cleanUsername
        });


      if (existingUser) {

        return res.status(409).json({
          message:
            "Username already exists"
        });

      }


      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );


      const employee =
        await User.create({

          name:
            name.trim(),

          username:
            cleanUsername,

          password:
            hashedPassword,

          role:
            "employee"

        });


      res.status(201).json({

        message:
          "Employee created successfully",

        employee: {

          _id: employee._id,

          name:
            employee.name,

          username:
            employee.username,

          role:
            employee.role

        }

      });

    } catch (error) {

      console.error(
        "CREATE EMPLOYEE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create employee"
      });

    }

  }
);


// =====================================================
// GET WORKLOAD
// =====================================================

app.get(
  "/api/workload",
  authenticateToken,

  async (req, res) => {

    try {

      const workloads =
        await Workload.find()
        .sort({
          createdAt: -1
        });


      res.json(workloads);

    } catch (error) {

      console.error(
        "GET WORKLOAD ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch workload"
      });

    }

  }
);


// =====================================================
// CREATE WORKLOAD
// =====================================================

app.post(
  "/api/workload",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const {
        employeeId,
        task,
        priority,
        deadline,
        status
      } = req.body;


      if (
        !employeeId ||
        !task ||
        !priority ||
        !deadline
      ) {

        return res.status(400).json({
          message:
            "Employee, task, priority and deadline are required"
        });

      }


      const employee =
        await User.findOne({

          _id: employeeId,

          role: "employee"

        });


      if (!employee) {

        return res.status(404).json({
          message:
            "Employee not found"
        });

      }


      const workload =
        await Workload.create({

          employeeId:
            employeeId,

          employeeName:
            employee.name,

          task:
            task.trim(),

          priority,

          deadline,

          status:
            status || "Pending"

        });


      return res.status(201).json({

        message:
          "Work assigned successfully",

        workload

      });

    } catch (error) {

      console.error(
        "CREATE WORKLOAD ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to assign work"
      });

    }

  }
);


// =====================================================
// UPDATE / MODIFY WORKLOAD
// =====================================================

app.put(
  "/api/workload/:id",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const workloadId =
        req.params.id;


      // Check valid MongoDB ID
      if (
        !mongoose.Types.ObjectId.isValid(
          workloadId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid workload ID."
        });

      }


      const {
        task,
        priority,
        deadline,
        status
      } = req.body;


      // Validate task
      if (
        !task ||
        !task.trim()
      ) {

        return res.status(400).json({
          message:
            "Task is required."
        });

      }


      // Update workload
      const updatedWorkload =
        await Workload.findByIdAndUpdate(

          workloadId,

          {
            task:
              task.trim(),

            priority:
              priority || "Medium",

            deadline:
              deadline || "",

            status:
              status || "Pending"
          },

          {
            new: true,

            runValidators: true
          }

        );


      // Workload not found
      if (!updatedWorkload) {

        return res.status(404).json({
          message:
            "Workload not found."
        });

      }


      // Success
      return res.json({

        message:
          "Workload updated successfully.",

        workload:
          updatedWorkload

      });

    } catch (error) {

      console.error(
        "UPDATE WORKLOAD ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update workload."
      });

    }

  }
);


// =====================================================
// DELETE WORKLOAD
// =====================================================

app.delete(
  "/api/workload/:id",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const workloadId =
        req.params.id;


      // Check valid MongoDB ID
      if (
        !mongoose.Types.ObjectId.isValid(
          workloadId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid workload ID."
        });

      }


      // Delete workload
      const deletedWorkload =
        await Workload.findByIdAndDelete(
          workloadId
        );


      // Workload not found
      if (!deletedWorkload) {

        return res.status(404).json({
          message:
            "Workload not found."
        });

      }


      // Success
      return res.json({

        message:
          "Workload deleted successfully."

      });

    } catch (error) {

      console.error(
        "DELETE WORKLOAD ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete workload."
      });

    }

  }
);


// =====================================================
// CONSULTATION - CREATE
// =====================================================

app.post(
  "/api/consultations",

  async (req, res) => {

    console.log(
      "================================="
    );

    console.log(
      "CONSULTATION ROUTE HIT"
    );

    console.log(
      "Request body:",
      req.body
    );

    console.log(
      "================================="
    );


    try {

      const {
        name,
        email,
        phone,
        service,
        message
      } = req.body;


      // Validate required fields
      if (
        !name ||
        !email ||
        !phone ||
        !service
      ) {

        return res.status(400).json({

          message:
            "Name, email, phone and service are required"

        });

      }


      // Save consultation in MongoDB
      const consultation =
        await Consultation.create({

          name:
            name.trim(),

          email:
            email.trim(),

          phone:
            phone.trim(),

          service:
            service.trim(),

          message:
            message
              ? message.trim()
              : ""

        });


      console.log(
        "Consultation saved successfully:",
        consultation._id
      );


      // =================================================
      // SEND EMAIL TO OWNER
      // =================================================

      try {

        const receiverEmail =
          process.env.EMAIL_TO ||
          process.env.EMAIL_USER;


        if (!process.env.EMAIL_USER) {

          throw new Error(
            "EMAIL_USER is missing in .env"
          );

        }


        if (!process.env.EMAIL_PASS) {

          throw new Error(
            "EMAIL_PASS is missing in .env"
          );

        }


        if (!receiverEmail) {

          throw new Error(
            "EMAIL_TO and EMAIL_USER are both missing in .env"
          );

        }


        console.log(
          "================================="
        );

        console.log(
          "STARTING CONSULTATION EMAIL"
        );

        console.log(
          "FROM:",
          process.env.EMAIL_USER
        );

        console.log(
          "TO:",
          receiverEmail
        );

        console.log(
          "================================="
        );


        const mailResult =
          await emailTransporter.sendMail({

            from:
              process.env.EMAIL_USER,

            to:
              receiverEmail,

            replyTo:
              email.trim(),

            subject:
              "New Consultation Request - CA Anil Raghuvanshi",

            html: `

              <div
                style="
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  max-width: 600px;
                  margin: auto;
                "
              >

                <h2>
                  New Consultation Request
                </h2>

                <hr>

                <p>
                  <strong>Name:</strong>
                  ${name.trim()}
                </p>

                <p>
                  <strong>Email:</strong>
                  ${email.trim()}
                </p>

                <p>
                  <strong>Phone:</strong>
                  ${phone.trim()}
                </p>

                <p>
                  <strong>Service:</strong>
                  ${service.trim()}
                </p>

                <p>
                  <strong>Message:</strong>
                  ${
                    message
                      ? message.trim()
                      : "No message provided"
                  }
                </p>

                <hr>

                <p>
                  This consultation request was
                  submitted through the
                  CA Anil Raghuvanshi website.
                </p>

              </div>

            `

          });


        console.log(
          "================================="
        );

        console.log(
          "CONSULTATION EMAIL SENT SUCCESSFULLY"
        );

        console.log(
          "MESSAGE ID:",
          mailResult.messageId
        );

        console.log(
          "RESPONSE:",
          mailResult.response
        );

        console.log(
          "================================="
        );


      } catch (emailError) {

        console.error(
          "================================="
        );

        console.error(
          "CONSULTATION EMAIL ERROR"
        );

        console.error(
          "NAME:",
          emailError.name
        );

        console.error(
          "MESSAGE:",
          emailError.message
        );

        console.error(
          "CODE:",
          emailError.code
        );

        console.error(
          "COMMAND:",
          emailError.command
        );

        console.error(
          "RESPONSE:",
          emailError.response
        );

        console.error(
          "RESPONSE CODE:",
          emailError.responseCode
        );

        console.error(
          "================================="
        );

        // Consultation is already saved.
        // Do not fail the consultation API
        // only because email failed.

      }


      // =================================================
      // FINAL RESPONSE
      // =================================================

      return res.status(201).json({

        message:
          "Consultation submitted successfully",

        consultation

      });


    } catch (error) {

      console.error(
        "CREATE CONSULTATION ERROR:",
        error
      );

      return res.status(500).json({

        message:
          "Failed to submit consultation"

      });

    }

  }
);


// =====================================================
// GET CONSULTATIONS
// =====================================================

app.get(
  "/api/consultations",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const consultations =
        await Consultation.find()
        .sort({
          createdAt: -1
        });


      res.json(consultations);

    } catch (error) {

      console.error(
        "GET CONSULTATIONS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch consultations"
      });

    }

  }
);


// =====================================================
// UPDATE CONSULTATION
// =====================================================

app.put(
  "/api/consultations/:id",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const {
        status
      } = req.body;


      const consultation =
        await Consultation.findByIdAndUpdate(

          req.params.id,

          {
            status
          },

          {
            new: true,
            runValidators: true
          }

        );


      if (!consultation) {

        return res.status(404).json({
          message:
            "Consultation not found"
        });

      }


      res.json({

        message:
          "Consultation updated successfully",

        consultation

      });

    } catch (error) {

      console.error(
        "UPDATE CONSULTATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update consultation"
      });

    }

  }
);


// =====================================================
// MONGODB + SERVER START
// =====================================================

const PORT =
  process.env.PORT || 5000;


async function startServer() {

  try {

    console.log(
      "================================="
    );

    console.log(
      "Connecting to MongoDB..."
    );

    console.log(
      "================================="
    );


    if (!process.env.MONGO_URI) {

      console.error(
        "MONGO_URI is missing in .env"
      );

      process.exit(1);

    }


    if (!process.env.JWT_SECRET) {

      console.error(
        "JWT_SECRET is missing in .env"
      );

      process.exit(1);

    }


    await mongoose.connect(
      process.env.MONGO_URI
    );


    console.log(
      "MongoDB Connected Successfully"
    );


    app.listen(
      PORT,
      "0.0.0.0",

      () => {

        console.log(
          "================================="
        );

        console.log(
          `Server running on http://localhost:${PORT}`
        );

        console.log(
          "================================="
        );

      }
    );


  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "MONGODB CONNECTION FAILED"
    );

    console.error(
      "NAME:",
      error.name
    );

    console.error(
      "MESSAGE:",
      error.message
    );

    console.error(
      "================================="
    );

    process.exit(1);

  }

}


startServer();
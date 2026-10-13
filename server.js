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
  requireOwner,
} = require("./middleware/auth");

const app = express();


// ===============================
// CORS
// ===============================

const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5501",
  "https://ca-anil-raghuvanshi-website.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,
  })
);

app.use(express.json());


// ===============================
// EMAIL CONFIGURATION
// ===============================

const emailTransporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// Check email configuration
emailTransporter.verify((error, success) => {
  if (error) {
    console.error(
      "EMAIL CONFIGURATION ERROR:",
      error.message
    );
  } else {
    console.log(
      "Email service is ready"
    );
  }
});


// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.json({
    message:
      "CA Website Backend is Running!",
  });
});


// ===============================
// LOGIN
// ===============================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        username,
        password,
      } = req.body;

      if (!username || !password) {

        return res.status(400).json({
          message:
            "Username and password are required",
        });

      }

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      const user =
        await User.findOne({
          username:
            cleanUsername,
        });

      if (!user) {

        return res.status(401).json({
          message:
            "Invalid username or password",
        });

      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {

        return res.status(401).json({
          message:
            "Invalid username or password",
        });

      }

      const token =
        jwt.sign(
          {
            id:
              user._id.toString(),

            username:
              user.username,

            role:
              user.role,
          },

          process.env.JWT_SECRET,

          {
            expiresIn: "8h",
          }
        );

      return res.json({

        token,

        user: {
          _id:
            user._id,

          name:
            user.name,

          username:
            user.username,

          role:
            user.role,
        },

      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Server error during login",
      });

    }

  }
);


// ===============================
// AUTH ME
// ===============================

app.get(
  "/api/auth/me",
  authenticateToken,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user.id
        ).select(
          "_id name username role createdAt updatedAt"
        );

      if (!user) {

        return res.status(404).json({
          message:
            "User not found",
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
          "Server error",
      });

    }

  }
);


// ===============================
// GET EMPLOYEES
// OWNER ONLY
// ===============================

app.get(
  "/api/employees",
  authenticateToken,
  requireOwner,
  async (req, res) => {

    try {

      const employees =
        await User.find({
          role:
            "employee",
        })
          .select(
            "_id name username role createdAt updatedAt"
          )
          .sort({
            createdAt:
              -1,
          });

      return res.json(
        employees
      );

    } catch (error) {

      console.error(
        "GET EMPLOYEES ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load employees",
      });

    }

  }
);


// ===============================
// CREATE EMPLOYEE
// OWNER ONLY
// ===============================

app.post(
  "/api/employees",
  authenticateToken,
  requireOwner,
  async (req, res) => {

    try {

      const {
        name,
        username,
        password,
      } = req.body;

      if (
        !name ||
        !username ||
        !password
      ) {

        return res.status(400).json({
          message:
            "Name, username and password are required",
        });

      }

      if (password.length < 6) {

        return res.status(400).json({
          message:
            "Password must be at least 6 characters",
        });

      }

      const cleanUsername =
        username
          .trim()
          .toLowerCase();

      const existingUser =
        await User.findOne({
          username:
            cleanUsername,
        });

      if (existingUser) {

        return res.status(409).json({
          message:
            "Username already exists",
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
            "employee",

        });

      return res.status(201).json({

        message:
          "Employee created successfully",

        employee: {

          _id:
            employee._id,

          name:
            employee.name,

          username:
            employee.username,

          role:
            employee.role,

        },

      });

    } catch (error) {

      console.error(
        "CREATE EMPLOYEE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Could not create employee",
      });

    }

  }
);


// ===============================
// GET WORKLOAD
// ===============================

app.get(
  "/api/workload",
  authenticateToken,
  async (req, res) => {

    try {

      let workloads;

      if (
        req.user.role ===
        "owner"
      ) {

        workloads =
          await Workload.find()
            .sort({
              createdAt:
                -1,
            });

      } else {

        workloads =
          await Workload.find({
            employeeId:
              req.user.id,
          }).sort({
            createdAt:
              -1,
          });

      }

      return res.json(
        workloads
      );

    } catch (error) {

      console.error(
        "GET WORKLOAD ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch workloads",
      });

    }

  }
);


// ===============================
// CREATE WORKLOAD
// OWNER ONLY
// ===============================

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
        status,
      } = req.body;

      if (!employeeId) {

        return res.status(400).json({
          message:
            "Employee is required",
        });

      }

      if (
        !task ||
        !task.trim()
      ) {

        return res.status(400).json({
          message:
            "Task is required",
        });

      }

      const employee =
        await User.findOne({
          _id:
            employeeId,

          role:
            "employee",
        });

      if (!employee) {

        return res.status(404).json({
          message:
            "Employee not found",
        });

      }

      const workload =
        await Workload.create({

          employeeId:
            employee._id,

          employeeName:
            employee.name,

          task:
            task.trim(),

          priority:
            priority ||
            "Medium",

          deadline:
            deadline ||
            "",

          status:
            status ||
            "Pending",

        });

      return res.status(201).json({

        message:
          "Workload assigned successfully",

        workload,

      });

    } catch (error) {

      console.error(
        "CREATE WORKLOAD ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to assign workload",
      });

    }

  }
);


// ===============================
// BOOK CONSULTATION
// PUBLIC
// ===============================

app.post(
  "/api/consultations",
  async (req, res) => {

    try {

      const {
        name,
        phone,
        email,
        service,
        message,
      } = req.body;


      // ===============================
      // VALIDATION
      // ===============================

      if (
        !name ||
        !phone ||
        !email ||
        !service
      ) {

        return res.status(400).json({
          message:
            "Name, phone, email and service are required",
        });

      }


      // ===============================
      // SAVE CONSULTATION
      // ===============================

      const consultation =
        await Consultation.create({

          name:
            name.trim(),

          phone:
            phone.trim(),

          email:
            email
              .trim()
              .toLowerCase(),

          service:
            service.trim(),

          message:
            message
              ? message.trim()
              : "",

          status:
            "New",

        });


      // ===============================
      // SEND EMAIL TO OWNER
      // ===============================

      try {

        await emailTransporter.sendMail({

          from:
            `"CA Website" <${process.env.EMAIL_USER}>`,

          to:
            process.env.OWNER_EMAIL,

          replyTo:
            email.trim(),

          subject:
            `New Consultation Booking - ${service}`,

          html: `

            <div
              style="
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #222;
              "
            >

              <h2
                style="color: #0b315d;"
              >
                New Consultation Booking
              </h2>

              <p>
                A new consultation has been booked through the CA website.
              </p>

              <hr>

              <h3>
                Client Details
              </h3>

              <p>
                <strong>Name:</strong>
                ${name.trim()}
              </p>

              <p>
                <strong>Phone:</strong>
                ${phone.trim()}
              </p>

              <p>
                <strong>Email:</strong>
                ${email.trim()}
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
                <strong>Status:</strong>
                New
              </p>

              <p>
                This consultation has been saved in the database.
              </p>

            </div>

          `,
        });

        console.log(
          "Consultation email sent successfully"
        );

      } catch (emailError) {

        console.error(
          "CONSULTATION EMAIL ERROR:",
          emailError.message
        );

        /*
          Consultation is already saved
          in MongoDB.

          Email failure will NOT delete
          the consultation.
        */

      }


      // ===============================
      // SUCCESS RESPONSE
      // ===============================

      return res.status(201).json({

        message:
          "Consultation booked successfully",

        consultation: {

          _id:
            consultation._id,

          name:
            consultation.name,

          phone:
            consultation.phone,

          email:
            consultation.email,

          service:
            consultation.service,

          message:
            consultation.message,

          status:
            consultation.status,

          createdAt:
            consultation.createdAt,

        },

      });

    } catch (error) {

      console.error(
        "CREATE CONSULTATION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to book consultation",
      });

    }

  }
);


// ===============================
// GET CONSULTATIONS
// OWNER ONLY
// ===============================

app.get(
  "/api/consultations",
  authenticateToken,
  requireOwner,
  async (req, res) => {

    try {

      const consultations =
        await Consultation.find()
          .sort({
            createdAt:
              -1,
          });

      return res.json(
        consultations
      );

    } catch (error) {

      console.error(
        "GET CONSULTATIONS ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load consultations",
      });

    }

  }
);


// ===============================
// UPDATE CONSULTATION STATUS
// OWNER ONLY
// ===============================

app.put(
  "/api/consultations/:id",
  authenticateToken,
  requireOwner,
  async (req, res) => {

    try {

      const {
        status,
      } = req.body;

      const allowedStatuses = [
        "New",
        "Contacted",
        "Completed",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid consultation status",
        });

      }

      const consultation =
        await Consultation.findByIdAndUpdate(

          req.params.id,

          {
            status,
          },

          {
            new:
              true,

            runValidators:
              true,
          }

        );

      if (!consultation) {

        return res.status(404).json({
          message:
            "Consultation not found",
        });

      }

      return res.json({

        message:
          "Consultation status updated",

        consultation,

      });

    } catch (error) {

      console.error(
        "UPDATE CONSULTATION ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update consultation",
      });

    }

  }
);


// ===============================
// START SERVER
// ===============================

const PORT =
  process.env.PORT ||
  5000;


async function startServer() {

  try {

    console.log(
      "Connecting to MongoDB..."
    );

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
          `Server running on port ${PORT}`
        );

      }
    );

  } catch (error) {

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

    process.exit(1);

  }

}


startServer();
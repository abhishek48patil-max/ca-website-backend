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

const PORT = process.env.PORT || 5000;


// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
  "http://localhost:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",

  "https://curious-kitten-8b981e.netlify.app",
  "https://kaleidoscopic-brioche-25e14d.netlify.app",
  "https://ca-anil-raghuvanshi-website.netlify.app"
];

app.use(
  cors({
    origin: function (origin, callback) {

      // Allow requests without origin
      // such as Postman/server-side requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS blocked origin:", origin);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    credentials: true
  })
);


// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// ======================================================
// MONGODB CONNECTION
// ======================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error.message
    );
  });


// ======================================================
// EMAIL CONFIGURATION
// ======================================================

let emailTransporter = null;

if (
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
) {

  emailTransporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 465,

    secure: true,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },

    connectionTimeout: 10000,

    greetingTimeout: 10000,

    socketTimeout: 15000

  });


  emailTransporter.verify((error) => {

    if (error) {

      console.error(
        "EMAIL CONFIGURATION ERROR:",
        error.message
      );

    } else {

      console.log(
        "Email transporter ready"
      );

    }

  });

} else {

  console.log(
    "EMAIL_USER or EMAIL_PASS is missing. Email functionality disabled."
  );

}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "CA Anil Raghuvanshi backend is running",
    status: "OK"
  });

});


// ======================================================
// CREATE TEST USER
// ======================================================

app.post(
  "/api/create-test-user",
  async (req, res) => {

    try {

      const {
        name,
        username,
        password,
        role
      } = req.body;

      if (
        !name ||
        !username ||
        !password
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Name, username and password are required"
        });

      }

      const existingUser =
        await User.findOne({
          username:
            username.toLowerCase().trim()
        });

      if (existingUser) {

        return res.status(409).json({
          success: false,
          message: "Username already exists"
        });

      }

      const hashedPassword =
        await bcrypt.hash(password, 10);

      const user = await User.create({

        name: name.trim(),

        username:
          username.toLowerCase().trim(),

        password: hashedPassword,

        role:
          role === "owner"
            ? "owner"
            : "employee"

      });

      res.status(201).json({

        success: true,

        message: "User created successfully",

        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role
        }

      });

    } catch (error) {

      console.error(
        "CREATE TEST USER ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to create user",

        error: error.message

      });

    }

  }
);


// ======================================================
// LOGIN
// ======================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        username,
        password
      } = req.body;

      if (
        !username ||
        !password
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Username and password are required"

        });

      }

      const user =
        await User.findOne({

          username:
            username.toLowerCase().trim()

        });

      if (!user) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid username or password"

        });

      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {

        return res.status(401).json({

          success: false,

          message:
            "Invalid username or password"

        });

      }

      const token =
        jwt.sign(

          {
            id: user._id.toString(),
            username: user.username,
            role: user.role,
            name: user.name
          },

          process.env.JWT_SECRET,

          {
            expiresIn: "8h"
          }

        );

      res.json({

        success: true,

        message: "Login successful",

        token,

        user: {

          id: user._id,
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

      res.status(500).json({

        success: false,

        message:
          "Login failed",

        error: error.message

      });

    }

  }
);


// ======================================================
// CURRENT USER
// ======================================================

app.get(
  "/api/auth/me",
  authenticateToken,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user.id
        ).select(
          "-password"
        );

      if (!user) {

        return res.status(404).json({

          success: false,

          message: "User not found"

        });

      }

      res.json({

        success: true,

        user

      });

    } catch (error) {

      console.error(
        "AUTH ME ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to get current user"

      });

    }

  }
);


// ======================================================
// GET EMPLOYEES
// OWNER ONLY
// ======================================================

app.get(
  "/api/employees",
  authenticateToken,
  requireOwner,
  async (req, res) => {

    try {

      const employees =
        await User.find({
          role: "employee"
        })
        .select(
          "_id name username role"
        )
        .sort({
          name: 1
        });

      res.json(employees);

    } catch (error) {

      console.error(
        "GET EMPLOYEES ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to fetch employees",

        error: error.message

      });

    }

  }
);


// ======================================================
// CREATE EMPLOYEE
// OWNER ONLY
// ======================================================

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

          success: false,

          message:
            "Name, username and password are required"

        });

      }

      const cleanUsername =
        username
          .toLowerCase()
          .trim();

      const existingUser =
        await User.findOne({
          username: cleanUsername
        });

      if (existingUser) {

        return res.status(409).json({

          success: false,

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

          name: name.trim(),

          username: cleanUsername,

          password: hashedPassword,

          role: "employee"

        });

      res.status(201).json({

        success: true,

        message:
          "Employee created successfully",

        employee: {

          _id: employee._id,

          name: employee.name,

          username: employee.username,

          role: employee.role

        }

      });

    } catch (error) {

      console.error(
        "CREATE EMPLOYEE ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to create employee",

        error: error.message

      });

    }

  }
);


// ======================================================
// GET WORKLOAD
// OWNER = ALL WORKLOADS
// EMPLOYEE = OWN WORKLOADS
// ======================================================

app.get(
  "/api/workload",
  authenticateToken,
  async (req, res) => {

    try {

      let query = {};

      if (req.user.role === "employee") {

        query = {
          employeeId: req.user.id
        };

      }

      const workloads =
        await Workload.find(query)
          .populate(
            "employeeId",
            "name username role"
          )
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

        success: false,

        message:
          "Failed to fetch workload",

        error: error.message

      });

    }

  }
);


// ======================================================
// CREATE WORKLOAD
// OWNER ONLY
// ======================================================

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
        !task
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Employee and task are required"

        });

      }

      const employee =
        await User.findOne({

          _id: employeeId,

          role: "employee"

        });

      if (!employee) {

        return res.status(404).json({

          success: false,

          message:
            "Employee not found"

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
            priority || "Medium",

          deadline:
            deadline || null,

          status:
            status || "Pending"

        });

      const populatedWorkload =
        await Workload.findById(
          workload._id
        ).populate(
          "employeeId",
          "name username role"
        );

      res.status(201).json({

        success: true,

        message:
          "Workload created successfully",

        workload:
          populatedWorkload

      });

    } catch (error) {

      console.error(
        "CREATE WORKLOAD ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to create workload",

        error: error.message

      });

    }

  }
);


// ======================================================
// UPDATE WORKLOAD
// ======================================================

app.put(
  "/api/workload/:id",
  authenticateToken,
  async (req, res) => {

    try {

      const workloadId =
        req.params.id;

      if (
        !mongoose.Types.ObjectId.isValid(
          workloadId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid workload ID"

        });

      }

      const workload =
        await Workload.findById(
          workloadId
        );

      if (!workload) {

        return res.status(404).json({

          success: false,

          message:
            "Workload not found"

        });

      }


      if (
        req.user.role === "employee"
      ) {

        if (
          workload.employeeId &&
          workload.employeeId.toString() !==
            req.user.id.toString()
        ) {

          return res.status(403).json({

            success: false,

            message:
              "You can update only your own workload"

          });

        }

        if (
          typeof req.body.status === "undefined"
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Status is required"

          });

        }

        workload.status =
          req.body.status;

        await workload.save();

      }


      else if (
        req.user.role === "owner"
      ) {

        const {
          employeeId,
          employee,
          task,
          priority,
          deadline,
          status
        } = req.body;


        const selectedEmployeeId =
          employeeId || employee;


        if (selectedEmployeeId) {

          if (
            !mongoose.Types.ObjectId.isValid(
              selectedEmployeeId
            )
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Invalid employee ID"

            });

          }

          const selectedEmployee =
            await User.findOne({

              _id: selectedEmployeeId,

              role: "employee"

            });

          if (!selectedEmployee) {

            return res.status(404).json({

              success: false,

              message:
                "Selected employee not found"

            });

          }

          workload.employeeId =
            selectedEmployee._id;

          workload.employeeName =
            selectedEmployee.name;

        }


        if (
          typeof task !== "undefined"
        ) {

          if (
            typeof task !== "string" ||
            !task.trim()
          ) {

            return res.status(400).json({

              success: false,

              message:
                "Task cannot be empty"

            });

          }

          workload.task =
            task.trim();

        }


        if (
          typeof priority !== "undefined"
        ) {

          workload.priority =
            priority;

        }

        if (
          typeof deadline !== "undefined"
        ) {

          workload.deadline =
            deadline || null;

        }


        if (
          typeof status !== "undefined"
        ) {

          workload.status =
            status;

        }


        await workload.save();

      }


      else {

        return res.status(403).json({

          success: false,

          message:
            "You are not authorized to update workload"

        });

      }


      const updatedWorkload =
        await Workload.findById(
          workload._id
        ).populate(
          "employeeId",
          "name username role"
        );

      return res.json({

        success: true,

        message:
          "Workload updated successfully",

        workload:
          updatedWorkload

      });

    } catch (error) {

      console.error(
        "UPDATE WORKLOAD ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Failed to update workload",

        error: error.message

      });

    }

  }
);


// ======================================================
// DELETE WORKLOAD
// OWNER ONLY
// ======================================================

app.delete(
  "/api/workload/:id",
  authenticateToken,
  requireOwner,
  async (req, res) => {

    try {

      const workloadId =
        req.params.id;

      if (
        !mongoose.Types.ObjectId.isValid(
          workloadId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid workload ID"

        });

      }

      const deletedWorkload =
        await Workload.findByIdAndDelete(
          workloadId
        );

      if (!deletedWorkload) {

        return res.status(404).json({

          success: false,

          message:
            "Workload not found"

        });

      }

      res.json({

        success: true,

        message:
          "Workload deleted successfully"

      });

    } catch (error) {

      console.error(
        "DELETE WORKLOAD ERROR:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to delete workload",

        error: error.message

      });

    }

  }
);


// ======================================================
// BOOK CONSULTATION
// ======================================================

app.post(
  "/api/consultation",
  async (req, res) => {

    try {

      const {
        name,
        email,
        phone,
        service,
        message
      } = req.body;


      // --------------------------------------------------
      // VALIDATION
      // --------------------------------------------------

      if (
        !name ||
        !email ||
        !phone ||
        !service
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Name, email, phone and service are required"

        });

      }


      // --------------------------------------------------
      // SAVE CONSULTATION TO MONGODB
      // --------------------------------------------------

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
        consultation._id.toString()
      );


      // --------------------------------------------------
      // RESPOND TO FRONTEND IMMEDIATELY
      // --------------------------------------------------

      res.status(201).json({

        success: true,

        message:
          "Consultation request submitted successfully",

        consultation

      });


      // --------------------------------------------------
      // SEND EMAIL IN BACKGROUND
      // --------------------------------------------------

      if (
        emailTransporter &&
        process.env.EMAIL_USER
      ) {

        emailTransporter
          .sendMail({

            from:
              process.env.EMAIL_USER,

            to:
              process.env.EMAIL_USER,

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
                  padding: 20px;
                "
              >

                <h2>
                  New Consultation Request
                </h2>

                <p>
                  A new consultation request
                  has been received from the website.
                </p>

                <hr>

                <p>
                  <strong>Name:</strong>
                  ${name}
                </p>

                <p>
                  <strong>Email:</strong>
                  ${email}
                </p>

                <p>
                  <strong>Phone:</strong>
                  ${phone}
                </p>

                <p>
                  <strong>Service:</strong>
                  ${service}
                </p>

                <p>
                  <strong>Message:</strong>
                  ${
                    message
                      ? message
                      : "No message provided"
                  }
                </p>

                <hr>

                <p>
                  This email was generated
                  from the CA Anil Raghuvanshi website.
                </p>

              </div>

            `

          })

          .then((info) => {

            console.log(
              "Consultation email sent successfully."
            );

            console.log(
              "Message ID:",
              info.messageId
            );

          })

          .catch((emailError) => {

            console.error(
              "CONSULTATION EMAIL ERROR:",
              emailError.message
            );

          });

      } else {

        console.error(
          "CONSULTATION EMAIL NOT SENT: EMAIL_USER or EMAIL_PASS is missing."
        );

      }


    } catch (error) {

      console.error(
        "CONSULTATION ERROR:",
        error
      );

      if (!res.headersSent) {

        return res.status(500).json({

          success: false,

          message:
            "Failed to submit consultation",

          error:
            error.message

        });

      }

    }

  }
);


// ======================================================
// 404
// ======================================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      message:
        "Route not found",

      path:
        req.originalUrl

    });

  }
);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (error, req, res, next) => {

    console.error(
      "GLOBAL SERVER ERROR:",
      error
    );

    if (
      error.message ===
      "Not allowed by CORS"
    ) {

      return res.status(403).json({

        success: false,

        message:
          "CORS policy blocked this request"

      });

    }

    res.status(500).json({

      success: false,

      message:
        "Internal server error",

      error:
        error.message

    });

  }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
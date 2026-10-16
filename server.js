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


/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "http://localhost:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",

  "https://curious-kitten-8b981e.netlify.app",
  "https://kaleidoscopic-brioche-25e14d.netlify.app"
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

      console.log("CORS BLOCKED:", origin);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,

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
    ]
  })
);

app.use(express.json());


/* =========================================================
   MONGODB
========================================================= */

console.log("=================================");
console.log("Connecting to MongoDB...");
console.log("=================================");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {

    console.log("=================================");
    console.log("MONGODB CONNECTED SUCCESSFULLY");
    console.log("=================================");

  })
  .catch((error) => {

    console.log("=================================");
    console.log("MONGODB CONNECTION FAILED");
    console.log("NAME:", error.name);
    console.log("MESSAGE:", error.message);
    console.log("=================================");

  });


/* =========================================================
   EMAIL
========================================================= */

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


transporter.verify((error, success) => {

  if (error) {

    console.log("=================================");
    console.log("EMAIL CONFIGURATION ERROR");
    console.log("NAME:", error.name);
    console.log("MESSAGE:", error.message);
    console.log("=================================");

  } else {

    console.log("=================================");
    console.log("EMAIL SERVER READY");
    console.log("=================================");

  }

});


/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

  res.send(
    "CA Anil Raghuvanshi Backend Running"
  );

});


/* =========================================================
   CREATE TEST USER
========================================================= */

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
        !password ||
        !role
      ) {

        return res.status(400).json({
          message: "All fields are required"
        });

      }


      const existingUser =
        await User.findOne({
          username:
            username.toLowerCase().trim()
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


      const user =
        await User.create({

          name,

          username:
            username
              .toLowerCase()
              .trim(),

          password:
            hashedPassword,

          role

        });


      res.status(201).json({

        message:
          "User created successfully",

        user: {

          id:
            user._id,

          name:
            user.name,

          username:
            user.username,

          role:
            user.role

        }

      });


    } catch (error) {

      console.log(
        "CREATE USER ERROR:",
        error
      );

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);


/* =========================================================
   LOGIN
========================================================= */

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
          message:
            "Username and password are required"
        });

      }


      const user =
        await User.findOne({

          username:
            username
              .toLowerCase()
              .trim()

        });


      if (!user) {

        return res.status(401).json({
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
          message:
            "Invalid username or password"
        });

      }


      const token =
        jwt.sign(

          {
            id:
              user._id,

            username:
              user.username,

            role:
              user.role,

            name:
              user.name
          },

          process.env.JWT_SECRET,

          {
            expiresIn: "8h"
          }

        );


      res.json({

        message:
          "Login successful",

        token,

        user: {

          id:
            user._id,

          name:
            user.name,

          username:
            user.username,

          role:
            user.role

        }

      });


    } catch (error) {

      console.log(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);


/* =========================================================
   AUTH ME
========================================================= */

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


      res.json({
        user
      });


    } catch (error) {

      console.log(
        "AUTH ME ERROR:",
        error
      );

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);


/* =========================================================
   GET EMPLOYEES
========================================================= */

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
        .select("-password")
        .sort({
          createdAt: -1
        });


      /*
        IMPORTANT:
        Frontend expects a direct array.
      */

      res.json(employees);


    } catch (error) {

      console.log(
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


/* =========================================================
   CREATE EMPLOYEE
========================================================= */

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
            "All fields are required"
        });

      }


      const cleanUsername =
        username
          .toLowerCase()
          .trim();


      const existingUser =
        await User.findOne({
          username:
            cleanUsername
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

          _id:
            employee._id,

          name:
            employee.name,

          username:
            employee.username,

          role:
            employee.role

        }

      });


    } catch (error) {

      console.log(
        "CREATE EMPLOYEE ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Server error"
      });

    }

  }
);


/* =========================================================
   GET WORKLOAD
========================================================= */

app.get(
  "/api/workload",
  authenticateToken,

  async (req, res) => {

    try {

      let workloads;


      /*
        OWNER:
        Owner can see all workloads.
      */

      if (
        req.user.role === "owner"
      ) {

        workloads =
          await Workload.find()
            .populate(
              "employeeId",
              "name username"
            )
            .sort({
              createdAt: -1
            });

      }


      /*
        EMPLOYEE:
        Employee can see only
        workloads assigned to himself.
      */

      else {

        workloads =
          await Workload.find({

            employeeId:
              req.user.id

          })
          .populate(
            "employeeId",
            "name username"
          )
          .sort({
            createdAt: -1
          });

      }


      /*
        Frontend expects direct array.
      */

      res.json(workloads);


    } catch (error) {

      console.log(
        "GET WORKLOAD ERROR:",
        error
      );

      console.log(
        "WORKLOAD ERROR MESSAGE:",
        error.message
      );


      res.status(500).json({

        message:
          "Server error",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   CREATE WORKLOAD
========================================================= */

app.post(
  "/api/workload",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      /*
        FRONTEND SENDS employeeId
        NOT employee.
      */

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

          message:
            "Employee and task are required"

        });

      }


      /*
        Make sure selected user
        actually exists and is an employee.
      */

      const employeeUser =
        await User.findOne({

          _id:
            employeeId,

          role:
            "employee"

        });


      if (!employeeUser) {

        return res.status(404).json({

          message:
            "Employee not found"

        });

      }


      /*
        Create workload using
        Workload schema fields.
      */

      const workload =
        await Workload.create({

          employeeId:
            employeeUser._id,

          employeeName:
            employeeUser.name,

          task:
            task.trim(),

          priority:
            priority || "Medium",

          deadline:
            deadline || "",

          status:
            status || "Pending"

        });


      /*
        Populate employee information
        before returning response.
      */

      const populatedWorkload =
        await Workload.findById(
          workload._id
        )
        .populate(
          "employeeId",
          "name username"
        );


      res.status(201).json({

        message:
          "Workload created successfully",

        workload:
          populatedWorkload

      });


    } catch (error) {

      console.log(
        "CREATE WORKLOAD ERROR:",
        error
      );

      console.log(
        "CREATE WORKLOAD ERROR MESSAGE:",
        error.message
      );


      res.status(500).json({

        message:
          "Server error",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   UPDATE WORKLOAD
========================================================= */

app.put(
  "/api/workload/:id",
  authenticateToken,

  async (req, res) => {

    try {

      const workload =
        await Workload.findById(
          req.params.id
        );


      if (!workload) {

        return res.status(404).json({

          message:
            "Workload not found"

        });

      }


      /*
        Employee can update only
        his own workload.
      */

      if (

        req.user.role !== "owner" &&

        workload.employeeId
          .toString() !==
        req.user.id.toString()

      ) {

        return res.status(403).json({

          message:
            "Access denied"

        });

      }


      /*
        Support both employeeId
        and old employee field.
      */

      const {
        employeeId,
        employee,
        task,
        priority,
        deadline,
        status
      } = req.body;


      /*
        OWNER UPDATE
      */

      if (
        req.user.role === "owner"
      ) {

        const selectedEmployeeId =
          employeeId !== undefined
            ? employeeId
            : employee;


        if (
          selectedEmployeeId !==
          undefined
        ) {

          const employeeUser =
            await User.findOne({

              _id:
                selectedEmployeeId,

              role:
                "employee"

            });


          if (!employeeUser) {

            return res.status(404).json({

              message:
                "Employee not found"

            });

          }


          workload.employeeId =
            employeeUser._id;

          workload.employeeName =
            employeeUser.name;

        }


        if (
          task !== undefined
        ) {

          workload.task =
            task.trim();

        }


        if (
          priority !== undefined
        ) {

          workload.priority =
            priority;

        }


        if (
          deadline !== undefined
        ) {

          workload.deadline =
            deadline;

        }


        if (
          status !== undefined
        ) {

          workload.status =
            status;

        }

      }


      /*
        EMPLOYEE UPDATE
        Employee can update
        only status.
      */

      else {

        if (
          status !== undefined
        ) {

          workload.status =
            status;

        }

      }


      await workload.save();


      const updatedWorkload =
        await Workload.findById(
          workload._id
        )
        .populate(
          "employeeId",
          "name username"
        );


      res.json({

        message:
          "Workload updated successfully",

        workload:
          updatedWorkload

      });


    } catch (error) {

      console.log(
        "UPDATE WORKLOAD ERROR:",
        error
      );

      console.log(
        "UPDATE WORKLOAD ERROR MESSAGE:",
        error.message
      );


      res.status(500).json({

        message:
          "Server error",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   DELETE WORKLOAD
========================================================= */

app.delete(
  "/api/workload/:id",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const workload =
        await Workload.findByIdAndDelete(
          req.params.id
        );


      if (!workload) {

        return res.status(404).json({

          message:
            "Workload not found"

        });

      }


      res.json({

        message:
          "Workload deleted successfully"

      });


    } catch (error) {

      console.log(
        "DELETE WORKLOAD ERROR:",
        error
      );

      res.status(500).json({

        message:
          "Server error"

      });

    }

  }
);


/* =========================================================
   CREATE CONSULTATION
========================================================= */

app.post(
  "/api/consultations",

  async (req, res) => {

    try {

      const {
        name,
        email,
        phone,
        service,
        message
      } = req.body;


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
        "================================="
      );

      console.log(
        "Consultation saved successfully:",
        consultation._id
      );

      console.log(
        "================================="
      );


      /*
        EMAIL
      */

      try {

        const receiverEmail =
          process.env.EMAIL_TO;

        const senderEmail =
          process.env.EMAIL_USER;


        if (!senderEmail) {

          throw new Error(
            "EMAIL_USER is missing"
          );

        }


        if (!receiverEmail) {

          throw new Error(
            "EMAIL_TO is missing"
          );

        }


        if (!process.env.EMAIL_PASS) {

          throw new Error(
            "EMAIL_PASS is missing"
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
          senderEmail
        );

        console.log(
          "TO:",
          receiverEmail
        );

        console.log(
          "================================="
        );


        const mailResult =
          await transporter.sendMail({

            from:
              senderEmail,

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
                  padding: 20px;
                  border: 1px solid #ddd;
                  border-radius: 10px;
                "
              >

                <h2
                  style="
                    color: #0b315d;
                  "
                >
                  New Consultation Request
                </h2>


                <p>
                  A new consultation request
                  has been submitted through
                  the CA Anil Raghuvanshi website.
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
                    message ||
                    "No message provided"
                  }
                </p>


                <hr>


                <p
                  style="
                    color: #666;
                  "
                >
                  This email was generated
                  automatically from the
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
          "EMAIL ID:",
          mailResult.messageId
        );

        console.log(
          "================================="
        );


      } catch (emailError) {

        console.log(
          "================================="
        );

        console.log(
          "CONSULTATION EMAIL ERROR"
        );

        console.log(
          "NAME:",
          emailError.name
        );

        console.log(
          "MESSAGE:",
          emailError.message
        );

        console.log(
          "================================="
        );

      }


      /* ---------------------------------------------
         RESPONSE
      --------------------------------------------- */

      return res.status(201).json({

        message:
          "Consultation submitted successfully",

        consultation

      });


    } catch (error) {

      console.log(
        "CONSULTATION ERROR:",
        error
      );


      return res.status(500).json({

        message:
          "Failed to submit consultation",

        error:
          error.message

      });

    }

  }
);


/* =========================================================
   GET CONSULTATIONS
========================================================= */

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


      res.json({

        consultations

      });


    } catch (error) {

      console.log(
        "GET CONSULTATIONS ERROR:",
        error
      );


      res.status(500).json({

        message:
          "Server error"

      });

    }

  }
);


/* =========================================================
   UPDATE CONSULTATION
========================================================= */

app.put(
  "/api/consultations/:id",
  authenticateToken,
  requireOwner,

  async (req, res) => {

    try {

      const consultation =
        await Consultation.findByIdAndUpdate(

          req.params.id,

          req.body,

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

      console.log(
        "UPDATE CONSULTATION ERROR:",
        error
      );


      res.status(500).json({

        message:
          "Server error"

      });

    }

  }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,

  () => {

    console.log(
      "================================="
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      "CA Anil Raghuvanshi Backend"
    );

    console.log(
      "================================="
    );

  }
);
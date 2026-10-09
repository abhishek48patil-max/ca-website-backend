const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const Workload = require("./models/Workload");
const User = require("./models/User");

const app = express();


/* ================================================= */
/*                    MIDDLEWARE                     */
/* ================================================= */

app.use(
    cors({
        origin: [
            "http://127.0.0.1:5501",
            "http://localhost:5501",
            "https://ca-anil-raghuvanshi-website.netlify.app"
        ],
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


/* ================================================= */
/*                MONGODB CONNECTION                 */
/* ================================================= */

mongoose
    .connect(process.env.MONGO_URI, {
        tls: true,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000
    })
    .then(() => {

        console.log(
            "MongoDB Connected Successfully"
        );

    })
    .catch((error) => {

        console.log(
            "MongoDB Connection Error:",
            error.message
        );

    });


mongoose.connection.on(
    "disconnected",
    () => {

        console.log(
            "MongoDB Disconnected"
        );

    }
);


mongoose.connection.on(
    "error",
    (error) => {

        console.log(
            "MongoDB Runtime Error:",
            error.message
        );

    }
);


/* ================================================= */
/*                    ROOT ROUTE                     */
/* ================================================= */

app.get(
    "/",
    (req, res) => {

        res.send(
            "CA Website Backend is Running!"
        );

    }
);


/* ================================================= */
/*             MONGODB DEBUG ROUTE                  */
/* ================================================= */

app.get(
    "/api/debug/mongo",
    async (req, res) => {

        try {

            await mongoose.connect(
                process.env.MONGO_URI,
                {
                    tls: true,
                    serverSelectionTimeoutMS: 10000,
                    connectTimeoutMS: 10000
                }
            );

            res.json({

                success: true,

                readyState:
                    mongoose.connection.readyState,

                host:
                    mongoose.connection.host,

                port:
                    mongoose.connection.port,

                name:
                    mongoose.connection.name

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                readyState:
                    mongoose.connection.readyState,

                name:
                    error.name,

                message:
                    error.message,

                reason:
                    error.reason
                        ? error.reason.message
                        : null

            });

        }

    }
);


/* ================================================= */
/*              CREATE TEST EMPLOYEE                 */
/* ================================================= */

app.post(
    "/api/auth/create-test-user",
    async (req, res) => {

        try {

            const existingUser =
                await User.findOne({
                    username: "employee"
                });

            if (existingUser) {

                return res.json({

                    message:
                        "Employee already exists",

                    username:
                        "employee"

                });

            }

            const hashedPassword =
                await bcrypt.hash(
                    "123456",
                    10
                );

            const user =
                await User.create({

                    name:
                        "CA Employee",

                    username:
                        "employee",

                    password:
                        hashedPassword,

                    role:
                        "employee"

                });

            res.status(201).json({

                message:
                    "Employee created successfully",

                username:
                    user.username,

                password:
                    "123456"

            });

        } catch (error) {

            console.log(
                "Create Employee Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to create employee",

                error:
                    error.message

            });

        }

    }
);


/* ================================================= */
/*                CREATE TEST OWNER                  */
/* ================================================= */

app.post(
    "/api/auth/create-test-owner",
    async (req, res) => {

        try {

            const existingOwner =
                await User.findOne({
                    username: "owner"
                });

            if (existingOwner) {

                return res.json({

                    message:
                        "Owner already exists",

                    username:
                        "owner"

                });

            }

            const hashedPassword =
                await bcrypt.hash(
                    "123456",
                    10
                );

            const owner =
                await User.create({

                    name:
                        "CA Anil Raghuvanshi",

                    username:
                        "owner",

                    password:
                        hashedPassword,

                    role:
                        "owner"

                });

            res.status(201).json({

                message:
                    "Owner created successfully",

                username:
                    owner.username,

                password:
                    "123456"

            });

        } catch (error) {

            console.log(
                "Create Owner Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to create owner",

                error:
                    error.message

            });

        }

    }
);


/* ================================================= */
/*                       LOGIN                       */
/* ================================================= */

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
                            .trim()
                            .toLowerCase()

                });

            if (!user) {

                return res.status(401).json({

                    message:
                        "Invalid username or password"

                });

            }

            const isPasswordCorrect =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!isPasswordCorrect) {

                return res.status(401).json({

                    message:
                        "Invalid username or password"

                });

            }

            const token =
                jwt.sign(

                    {
                        userId:
                            user._id,

                        username:
                            user.username,

                        role:
                            user.role
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "8h"
                    }

                );

            res.json({

                message:
                    "Login successful",

                token:
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
                "Login Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Login failed",

                error:
                    error.message

            });

        }

    }
);


/* ================================================= */
/*                AUTHENTICATE TOKEN                 */
/* ================================================= */

function authenticateToken(
    req,
    res,
    next
) {

    const authHeader =
        req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({

            message:
                "Access denied. Please login."

        });

    }

    const parts =
        authHeader.split(" ");

    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer"
    ) {

        return res.status(401).json({

            message:
                "Invalid authorization format"

        });

    }

    const token =
        parts[1];

    if (!token) {

        return res.status(401).json({

            message:
                "Invalid authorization token"

        });

    }

    try {

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user =
            decoded;

        next();

    } catch (error) {

        return res.status(403).json({

            message:
                "Invalid or expired token"

        });

    }

}


/* ================================================= */
/*                    ROLE CHECK                     */
/* ================================================= */

function requireRole(
    ...allowedRoles
) {

    return (
        req,
        res,
        next
    ) => {

        if (!req.user) {

            return res.status(401).json({

                message:
                    "Please login first"

            });

        }

        if (
            !allowedRoles.includes(
                req.user.role
            )
        ) {

            return res.status(403).json({

                message:
                    "You do not have permission to perform this action"

            });

        }

        next();

    };

}


/* ================================================= */
/*                 CURRENT USER                      */
/* ================================================= */

app.get(
    "/api/auth/me",
    authenticateToken,
    async (req, res) => {

        try {

            const user =
                await User
                    .findById(
                        req.user.userId
                    )
                    .select("-password");

            if (!user) {

                return res.status(404).json({

                    message:
                        "User not found"

                });

            }

            res.json(user);

        } catch (error) {

            console.log(
                "Get Current User Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to get user",

                error:
                    error.message

            });

        }

    }
);


/* ================================================= */
/*                EMPLOYEE MANAGEMENT                */
/* ================================================= */


/* ================= GET EMPLOYEES ================= */

app.get(
    "/api/employees",
    authenticateToken,
    requireRole("owner"),
    async (req, res) => {

        try {

            const employees =
                await User
                    .find({
                        role: "employee"
                    })
                    .select("-password")
                    .sort({
                        createdAt: -1
                    });

            res.json(employees);

        } catch (error) {

            console.log(
                "Get Employees Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to fetch employees",

                error:
                    error.message

            });

        }

    }
);


/* ================= CREATE EMPLOYEE ================= */

app.post(
    "/api/employees",
    authenticateToken,
    requireRole("owner"),
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

            if (
                password.length < 6
            ) {

                return res.status(400).json({

                    message:
                        "Password must be at least 6 characters"

                });

            }

            const cleanUsername =
                username
                    .trim()
                    .toLowerCase();

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

                    id:
                        employee._id,

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
                "Create Employee Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to create employee",

                error:
                    error.message

            });

        }

    }
);


/* ================================================= */
/*                     WORKLOAD                     */
/* ================================================= */


/* ================= GET WORKLOAD ================= */

app.get(
    "/api/workload",
    authenticateToken,
    async (req, res) => {

        try {

            let workloads;

            if (
                req.user.role === "owner"
            ) {

                workloads =
                    await Workload
                        .find()
                        .sort({
                            createdAt: -1
                        });

            } else {

                workloads =
                    await Workload
                        .find({

                            employeeId:
                                req.user.userId

                        })
                        .sort({
                            createdAt: -1
                        });

            }

            res.json(workloads);

        } catch (error) {

            console.log(
                "Fetch Workload Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to fetch workloads",

                error:
                    error.message

            });

        }

    }
);


/* ================= ADD WORKLOAD ================= */

app.post(
    "/api/workload",
    authenticateToken,
    requireRole("owner"),
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

                    message:
                        "Employee and task are required"

                });

            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    employeeId
                )
            ) {

                return res.status(400).json({

                    message:
                        "Invalid employee selected"

                });

            }

            const employee =
                await User.findOne({

                    _id:
                        employeeId,

                    role:
                        "employee"

                });

            if (!employee) {

                return res.status(404).json({

                    message:
                        "Selected employee was not found"

                });

            }

            const newWorkload =
                new Workload({

                    employeeId:
                        employee._id,

                    employeeName:
                        employee.name,

                    task:
                        task.trim(),

                    priority:
                        priority,

                    deadline:
                        deadline,

                    status:
                        status

                });

            const savedWorkload =
                await newWorkload.save();

            res.status(201).json({

                message:
                    "Workload assigned successfully",

                workload:
                    savedWorkload

            });

        } catch (error) {

            console.log(
                "Add Workload Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to assign workload",

                error:
                    error.message

            });

        }

    }
);


/* ================= DELETE WORKLOAD ================= */

app.delete(
    "/api/workload/:id",
    authenticateToken,
    requireRole("owner"),
    async (req, res) => {

        try {

            const deletedWorkload =
                await Workload.findByIdAndDelete(
                    req.params.id
                );

            if (!deletedWorkload) {

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
                "Delete Workload Error:",
                error.message
            );

            res.status(500).json({

                message:
                    "Failed to delete workload",

                error:
                    error.message

            });

        }

    }
);


/* ================================================= */
/*                     SERVER                        */
/* ================================================= */

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

    }
);
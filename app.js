import express from "express";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import xssClean from "xss-clean";
import mongoSanitize from "express-mongo-sanitize";
import cors from "cors";

import userRoute from "./src/resources/user/routes/user.routes.js";
import authRoute from "./src/resources/auth/routes/auth.routes.js";
import courseRoute from "./src/resources/courses/routes/course.routes.js";
import prerecordedContentRoute from "./src/resources/courses/routes/prerecordedContent.routes.js";
import liveClassRoute from "./src/resources/live-classes/routes/liveClass.routes.js";
import bookingRoute from "./src/resources/bookings/routes/booking.routes.js";
import paymentRoute from "./src/resources/payments/routes/payment.routes.js";
const app = express();

app.use(morgan("dev"));
app.use(cors({
  origin: "*", // Allow all origins, adjust as needed for production  
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// XSS protection middleware
app.use(xssClean());

// MongoDB query sanitizer middleware
app.use(mongoSanitize());

app.get("/", (req, res) => {
  res.send("Welcome to TechyJaunt Learning Platform 🎓✨");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "TechyJaunt API is running properly",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Define rate limiter options
const limiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // maximum of 5 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: function (req, res) {
    // Generate a unique key using the user token (assuming it's stored in the request header)
    return req.headers.authorization || req.ip;
  },
});

// Apply rate limiter middleware to endpoints matching the prefix
app.use("/api/v1/*", limiter);

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/courses", courseRoute);
app.use("/api/v1/content", prerecordedContentRoute);
app.use("/api/v1/live-classes", liveClassRoute);
app.use("/api/v1/bookings", bookingRoute);
app.use("/api/v1/payments", paymentRoute);

export default app;

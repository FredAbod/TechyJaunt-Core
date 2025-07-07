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

// Server IP endpoint for Paystack whitelisting
app.get("/server-info", (req, res) => {
  const serverInfo = {
    status: "success",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    server: {
      // Client IP (the IP making the request)
      clientIP: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
      
      // Server headers that might contain the real IP
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'x-client-ip': req.headers['x-client-ip'],
        'cf-connecting-ip': req.headers['cf-connecting-ip'], // Cloudflare
        'true-client-ip': req.headers['true-client-ip'],
        'user-agent': req.headers['user-agent'],
        'host': req.headers.host,
        'origin': req.headers.origin,
        'referer': req.headers.referer
      },
      
      // Server information
      hostname: req.hostname,
      protocol: req.protocol,
      baseUrl: `${req.protocol}://${req.get('host')}`,
      port: process.env.PORT || 4000,
      
      // Webhook URL for Paystack
      webhookUrl: `${req.protocol}://${req.get('host')}/api/v1/payments/webhook`,
      
      // Instructions
      instructions: {
        paystack: "Use the 'publicIP' or 'clientIP' value to whitelist in Paystack dashboard",
        webhook: "Use the 'webhookUrl' for Paystack webhook configuration",
        note: "If deployed behind a proxy/load balancer, check x-forwarded-for header"
      }
    }
  };

  // Try to get public IP using external service
  import('https').then(https => {
    const options = {
      hostname: 'api.ipify.org',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 5000
    };

    const req2 = https.request(options, (res2) => {
      let data = '';
      res2.on('data', (chunk) => data += chunk);
      res2.on('end', () => {
        serverInfo.server.publicIP = data.trim();
        res.status(200).json(serverInfo);
      });
    });

    req2.on('error', () => {
      serverInfo.server.publicIP = 'Unable to fetch public IP';
      res.status(200).json(serverInfo);
    });

    req2.on('timeout', () => {
      req2.destroy();
      serverInfo.server.publicIP = 'Timeout fetching public IP';
      res.status(200).json(serverInfo);
    });

    req2.end();
  }).catch(() => {
    serverInfo.server.publicIP = 'Error fetching public IP';
    res.status(200).json(serverInfo);
  });
});

// Simple IP endpoint for quick IP checking
app.get("/ip", (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                   (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  
  res.status(200).json({
    ip: clientIP,
    forwarded: req.headers['x-forwarded-for'],
    realIP: req.headers['x-real-ip'],
    timestamp: new Date().toISOString()
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

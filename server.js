require("dotenv").config();
const express = require("express");
const app = express();
const authRoute = require("./routes/auth-router");
const contactRoute = require("./routes/contact-router");
const studentRoutes = require("./routes/student-router");
const cors = require("cors");
const connectDB = require("./utilities/db");
const errorMiddleware = require("./middlewares/error_middleware");

// ✅ CORS Options
const corsOption = {
  origin: [
    "http://localhost:5173",
    "https://degreeverificationusingnfc-production-3b5b.up.railway.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  credentials: true,
};

// ✅ Apply CORS before all routes
app.use(cors(corsOption));

app.use(express.json());

// ✅ Routes
app.use("/", authRoute);
app.use("/form", contactRoute);
app.use("/api/students", studentRoutes);

// ✅ Error Middleware should be last
app.use(errorMiddleware);

const port = 5000;

// ✅ Connect DB & Start Server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

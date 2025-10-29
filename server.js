require("dotenv").config();
const express = require("express");
const app = express();
const authRoute = require("./routes/auth-router");
const contactRoute = require("./routes/contact-router");
const studentRoutes = require("./routes/student-router");
const cors = require("cors");
const connectDB = require('./utilities/db');
const errorMiddleware = require("./middlewares/error_middleware");
// tackle cors 
const corsOption = {
  origin: [
    "http://localhost:5173",
    "https://degreeverificationusingnfc-production-3b5b.up.railway.app",
    "https://degreeverificationusingnfc.netlify.app", // if your frontend is deployed
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  credentials: true,
};
app.use(cors(corsOption));

app.use(express.json());
app.use("/",authRoute);
app.use("/form",contactRoute);
app.use(errorMiddleware);
app.use("/api/students", studentRoutes);
const port = 5000;
connectDB().then(()=>{
  const port = 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

})


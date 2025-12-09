// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// 1. Allow your HTML file to talk to this server
app.use(cors());
app.use(express.json());

// 2. Connect to your LOCAL MongoDB
// We will create a database named 'lumini_local_db'
mongoose
  .connect("mongodb://127.0.0.1:27017/lumini_local_db")
  .then(() => console.log("✅ Database Connected!"))
  .catch((err) => console.error("❌ Mongo Error:", err));

// 3. Create the Teacher Schema (Matches your HTML inputs)
const TeacherSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  houseUnit: String,
  street: String,
  barangay: String,
  city: String,
  zipcode: String,
  role: { type: String, default: "teacher" }, // Auto-tag them as teacher
  dateJoined: { type: Date, default: Date.now },
});

const Teacher = mongoose.model("Teacher", TeacherSchema);

// 4. The Registration Route
app.post("/register-teacher", async (req, res) => {
  try {
    console.log("Received Data:", req.body); // Print data to terminal for debugging
    const newTeacher = new Teacher(req.body);
    await newTeacher.save();
    res.json({ success: true, message: "Teacher Registered Successfully!" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error saving to database" });
  }
});

// === LOGIN ROUTE ===
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Check if user exists in the Teacher collection
    // (If you have Parents/Guardians later, you'll need to check those collections too)
    const user = await Teacher.findOne({
      username: username,
      password: password,
    });

    if (user) {
      // MATCH FOUND!
      res.json({
        success: true,
        message: "Login Successful",
        role: user.role,
        firstname: user.firstname,
        username: user.username,
      });
    } else {
      // NO MATCH
      res.json({ success: false, message: "Invalid Username or Password" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// BREAKER //

// 5. Start the Server on Port 3000
app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);

// BREAKER //

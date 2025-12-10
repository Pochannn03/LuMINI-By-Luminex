const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer"); // 1. Import Multer
const path = require("path");
const app = express();

// --- CONFIGURATION SECTION (MUST BE AT THE TOP) ---

// A. Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// B. Multer Storage Engine (The "Upload" logic)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Saves to 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// C. Initialize the 'upload' variable
// (This creates the variable that was missing in your error!)
const upload = multer({ storage: storage });

// D. Database Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/lumini_local_db")
  .then(() => console.log("✅ Database Connected!"))
  .catch((err) => console.error("❌ Mongo Error:", err));

// --- SCHEMAS ---

const TeacherSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  role: { type: String, default: "teacher" },
  profilePhoto: String,
  dateJoined: { type: Date, default: Date.now },
});
const Teacher = mongoose.model("Teacher", TeacherSchema);

const StudentSchema = new mongoose.Schema({
  studentID: String,
  firstname: String,
  lastname: String,
  gradeLevel: String,
  section: String,
  parentInviteCode: String,
  parentUsername: String, // <--- We will update this field!
});
const Student = mongoose.model("Student", StudentSchema);

const ParentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  relationship: String,
  childName: String,
  houseUnit: String,
  street: String,
  barangay: String,
  city: String,
  zipcode: String,
  role: { type: String, default: "parent" },
  profilePhoto: String,
  dateJoined: { type: Date, default: Date.now },
});
const Parent = mongoose.model("Parent", ParentSchema);

// --- ROUTES ---

// 1. REGISTER TEACHER
// Now 'upload' is defined, so this line will work!
app.post(
  "/register-teacher",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      const teacherData = {
        ...req.body,
        profilePhoto: req.file ? "/uploads/" + req.file.filename : null,
      };
      const newTeacher = new Teacher(teacherData);
      await newTeacher.save();
      res.json({ success: true, message: "Teacher Registered!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error saving data" });
    }
  }
);

// 2. REGISTER PARENT (UPDATED)
app.post(
  "/register-parent",
  upload.single("profile-upload"),
  async (req, res) => {
    try {
      console.log("📥 New Parent Registration:", req.body.username);

      // 1. Save the Parent
      const parentData = {
        ...req.body,
        profilePhoto: req.file ? "/uploads/" + req.file.filename : null,
      };
      const newParent = new Parent(parentData);
      await newParent.save();

      // 2. UPDATE THE STUDENT (Create the Relation)
      const studentID = req.body.linked_student_id;

      if (studentID) {
        // Create the full name from the form data
        const fullParentName = `${req.body.firstname} ${req.body.lastname}`;

        await Student.updateOne(
          { studentID: studentID },
          {
            $set: {
              // STORING REAL FULL NAME instead of username
              parentUsername: fullParentName,
            },
          }
        );
        console.log(
          `🔗 Linked Parent "${fullParentName}" to Student ${studentID}`
        );
      }

      res.json({ success: true, message: "Parent Account Created & Linked!" });
    } catch (error) {
      console.error("❌ Parent Save Error:", error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

// 4. VERIFY INVITE CODE (Add this new route)
app.post("/verify-invite-code", async (req, res) => {
  const { code } = req.body;
  try {
    const student = await Student.findOne({ parentInviteCode: code });
    if (student) {
      res.json({
        success: true,
        childName: `${student.firstname} ${student.lastname}`,
        studentID: student.studentID, // sending this to the frontend
      });
    } else {
      res.json({ success: false, message: "Invalid Invitation Code" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 3. LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await Teacher.findOne({ username, password });
    if (!user) user = await Parent.findOne({ username, password });

    if (user) {
      res.json({
        success: true,
        message: "Login Successful",

        // Basic Info
        role: user.role,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,

        // Contact Info
        email: user.email,
        phone: user.phone,
        houseUnit: user.houseUnit,
        street: user.street,
        barangay: user.barangay,
        city: user.city,
        zipcode: user.zipcode,

        // Profile Photo
        profilePhoto: user.profilePhoto,
      });
    } else {
      res.json({ success: false, message: "Invalid Username or Password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 5. GET MY CHILDREN
app.post("/get-my-children", async (req, res) => {
  const { parentName } = req.body;

  try {
    // Find students linked to this parent's full name
    const children = await Student.find({ parentUsername: parentName });

    res.json({ success: true, children: children });
  } catch (error) {
    console.error("Error fetching children:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// --- START SERVER ---
app.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);

// seed_admin.js
const mongoose = require("mongoose");

// 1. Connect to your Database
mongoose
  .connect("mongodb://127.0.0.1:27017/lumini_local_db")
  .then(() => console.log("✅ Connected to DB..."))
  .catch((err) => console.error("❌ DB Connection Error:", err));

// 2. Define the Schema (Must match server.js)
const AdminSchema = new mongoose.Schema({
  username: String,
  password: String,
  firstname: String,
  lastname: String,
  role: { type: String, default: "admin" },
  profilePhoto: String,
});
const Admin = mongoose.model("Admin", AdminSchema);

// 3. Create the User
const seedDB = async () => {
  // Optional: Check if admin exists to avoid duplicates
  const exist = await Admin.findOne({ username: "Admin_01" });
  if (exist) {
    console.log("⚠️ Admin_01 already exists!");
    process.exit();
  }

  const newAdmin = new Admin({
    username: "Admin_01",
    password: "luminex123", // In a real app, hash this!
    firstname: "Admin_01", // Using username as name for now
    lastname: "(System)",
    profilePhoto: "/assets/placeholder_image.jpg", // Default image
  });

  await newAdmin.save();
  console.log("🎉 Admin_01 created successfully!");
  process.exit();
};

seedDB();

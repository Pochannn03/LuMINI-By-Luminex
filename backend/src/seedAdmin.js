import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "./models/users.js"; 

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Connected to MongoDB...");

    const existingAdmin = await User.findOne({ username: "superadmin" });
    
    if (existingAdmin) {
      console.log("⚠️ Super Admin already exists. No changes made.");
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("LuminiAdmin123!", salt);

    const superAdmin = new User({
      user_id: 1,
      username: "superadmin",
      password: hashedPassword,
      email: "admin@lumini.edu.ph",
      first_name: "Super",
      last_name: "Admin",
      phone_number: "09123456789",
      address: "Rizal Technological University",
      relationship: "N/A",
      role: "superadmin",
      is_archive: false,
      created_by: "system_seed",
      updated_by: "system_seed"
    });

    await superAdmin.save();
    console.log("✅ Super Admin created successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Connection closed.");
    process.exit();
  }
};

seedSuperAdmin();
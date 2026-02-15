// backend/controllers/guardianController.js
const GuardianRequest = require('../../models/GuardianRequest');
const bcrypt = require('bcryptjs');

exports.submitGuardianRequest = async (req, res) => {
  try {
    // 1. Get the text data from the frontend
    const { firstName, lastName, phone, role, username, password } = req.body;
    
    // In a real app, you get this from your auth middleware (e.g., req.user.id)
    // For testing right now, we'll hardcode a dummy ObjectId, or you can pass it from frontend
    const parentId = req.body.parentId || "60d5ecb8b392d700153ee123"; 

    // 2. Get the file path that Multer just saved
    const idPhotoPath = req.file ? req.file.path : null;

    if (!idPhotoPath) {
      return res.status(400).json({ message: "ID photo is required." });
    }

    // 3. Hash the temporary password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create the request in the database
    const newRequest = new GuardianRequest({
      parent: parentId,
      guardianDetails: {
        firstName,
        lastName,
        phone,
        role,
        tempUsername: username,
        tempPassword: hashedPassword,
        idPhotoPath: idPhotoPath
      }
    });

    await newRequest.save();

    res.status(201).json({ 
      message: "Guardian request submitted successfully!",
      request: newRequest 
    });

  } catch (error) {
    console.error("Submit Request Error:", error);
    res.status(500).json({ message: "Server error during submission." });
  }
};
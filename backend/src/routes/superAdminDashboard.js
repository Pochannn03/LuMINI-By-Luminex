import { Router } from "express";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Counter } from '../models/counter.js';
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';

const router = Router();

// NUMBER OF STUDENTS/TEACHERS/PARENTS

router.get('/api/users', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try{

      const teachers = await User.find({ 
        is_archive: false, 
        relationship: 'Teacher'
      });
      
      const users = await User.find({ 
        is_archive: false, 
        relationship: { 
          $in: ['Parent', 'Guardian'] 
        } 
      });

      const students = await Student.find({
        is_archive: false,
      })

    res.status(200).json({ 
      success: true, 
      teachers: teachers || [], 
      users: users || [], 
      students: students || [] 
    });
  
    } catch(err) {
      console.error("Error fetching students:", err);
      res.status(500).json({ msg: "Server error while fetching students" });
    }
})

export default router;
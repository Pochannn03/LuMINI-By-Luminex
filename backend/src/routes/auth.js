import { Router } from "express";
import passport from "../config/passport.js";

const router = Router();

router.post('/api/auth', (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    req.logIn(user, (err) => {
    if (err) {
    return res.status(500).json({ message: "Session login failed" });
  } else {
    const safeUser = {
        id: user._id,
        username: user.username,
        role: user.role,
    };

    return res.status(200).json({ 
      message: "Login successful", 
      user: safeUser
    });
  }
    });
  })(req, res, next); 
});

router.post('/api/auth/logout', (req, res) => {
    if(!req.user){
      return res.sendStatus(401)
    }

    req.logout((err) => {
      if(err){
        return res.sendStatus(401);
      } else {
        res.send(200);
      }
    })
  }
);

export default router;
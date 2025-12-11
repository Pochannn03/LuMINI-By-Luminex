import { Router } from "express";
import passport from "../config/passport.js";


const router = Router();

router.post('/api/auth', passport.authenticate("local"), (req, res) => {
    console.log("Login successfully")
    return res.sendStatus(200);
  }
);

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
import passport from 'passport'
import { Strategy } from 'passport-local'
import { User } from '../models/users.js'
import { comparePassword } from '../utils/passwordUtils.js';

passport.serializeUser((user, done) => {
  done(null, user.id)
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            // DO NOT use 'throw new Error()' here!
            // This safely tells Passport the session is invalid without crashing the server.
            return done(null, false); 
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
});

export default passport.use(
  new Strategy( async (username, password, done) => {
    try{
      const findUser = await User.findOne({ username });
      if(!findUser) {
        return done(null, false, { message: "User not found" });
      }
      const isValid = await comparePassword(password, findUser.password);
      if (!isValid) { 
        return done(null, false, { message: "Invalid Credentials" });
      }
      done(null, findUser)
    } catch (err) {
      done(err, null);
    }
  })
)
import express from 'express';
import cors from "cors";
import cookieParser from 'cookie-parser';
import session from 'express-session';
import mongoose from "mongoose";
import passport from 'passport';
import MongoStore from 'connect-mongo';

import router from './routes/index.js';


const PORT = process.env.PORT || 3000;
const app = express();

mongoose
  .connect("mongodb://127.0.0.1/LuMINI")
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log(`Error ${err}`));

app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || '0e8b85b58a23be2ee4479cd814fe36d0dd50885054ee09c1b5913b778ba0f7dc'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || '4255883970d20fafb23c83f24ea4768db34a0f91bb5db86b8bc48008dd018d50',
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60,
    },
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    })
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(router);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
  }
);


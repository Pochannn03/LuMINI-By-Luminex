import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import session from "express-session";
import mongoose from "mongoose";
import passport from "passport";
import MongoStore from "connect-mongo";
import router from "./routes/index.js";
import "./config/passport.js";
import path from "path"; // <-- ADDED PATH IMPORT

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT"],
    credentials: true
  }
});

app.set('socketio', io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log(`Error ${err}`));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60,
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60,
    }),
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(router);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server and WebSockets running on port ${PORT}`);
});

io.on('connection', (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);
});
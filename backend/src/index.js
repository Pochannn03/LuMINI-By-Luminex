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
import path from "path";

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

// 1. DYNAMIC FRONTEND URL (Defaults to localhost for your local testing)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// 2. UPDATED SOCKET.IO CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,          // https://lumini-luminex.com
      "https://www.lumini-luminex.com",  // Explicitly allow the www version
      "http://localhost:5173"            // Local development
    ], 
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true
  }
});

app.set('socketio', io);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log(`Error ${err}`));

// 3. UPDATED EXPRESS CORS
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,           // https://lumini-luminex.com
        "https://www.lumini-luminex.com",   // Explicitly allow the www version
        "http://localhost:5173"             // Local development
    ], 
    credentials: true 
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(cookieParser(process.env.COOKIE_SECRET));
const isProduction = process.env.NODE_ENV === "production";
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60, // 1 hour
      secure: isProduction, // TRUE in production (requires HTTPS)
      sameSite: isProduction ? "none" : "lax", // REQUIRED for cross-domain cookies
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
  res.send("LuMINI Backend Server is running successfully!");
});

httpServer.listen(PORT, () => {
});

io.on("connection", (socket) => {

  socket.on("join", (userId) => {
    if (!userId) return;

    const roomName = `user_${userId}`;
    socket.join(roomName);
  });

  socket.on("disconnect", () => {
  });
});

export { io };
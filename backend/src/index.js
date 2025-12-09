import express from 'express';
import cors from "cors";
import mongoose from "mongoose";


const PORT = process.env.PORT || 3000;
const app = express();

mongoose
  .connect("mongodb://127.0.0.1/LuMINI")
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log(`Error ${err}`));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
  }
);


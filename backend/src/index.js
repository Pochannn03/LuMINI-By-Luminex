import express from 'express';

const PORT = process.env.PORT || 3000;
const app = express();

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
  }
);


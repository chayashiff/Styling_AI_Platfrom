import cors from "cors";
import express from "express";

import { getRecommendationController } from "./controllers/recommendationController.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/recommendations", getRecommendationController);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

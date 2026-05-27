import cors from "cors";
import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { getRecommendations } from "./services/aiRecommendationService.js";
import { filterProducts } from "./services/filterService.js";

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const productsFilePath = join(__dirname, "data", "products.json");

app.use(cors());
app.use(express.json());

async function loadProducts() {
  const fileContent = await readFile(productsFilePath, "utf8");
  const productsData = JSON.parse(fileContent);

  return productsData.Products;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/recommendations", async (req, res) => {
  try {
    const userProfile = req.body;
    const products = await loadProducts();
    const filterResult = filterProducts(userProfile, products);
    const recommendationResult = await getRecommendations(
      userProfile,
      filterResult.products,
    );

    res.json({
      source: recommendationResult.source,
      message: filterResult.message,
      recommendations: recommendationResult.recommendations,
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

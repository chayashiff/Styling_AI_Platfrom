import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { getRecommendations } from "../services/aiRecommendationService.js";
import { filterProducts } from "../services/filterService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const productsFilePath = join(__dirname, "..", "data", "products.json");

// טוען את רשימת המוצרים מקובץ ה-JSON המקומי בכל בקשת המלצות.
async function loadProducts() {
  const fileContent = await readFile(productsFilePath, "utf8");
  const productsData = JSON.parse(fileContent);

  return productsData.Products;
}

// מנהל את בקשת ההמלצות: מקבל פרופיל משתמש, מסנן מוצרים ומחזיר המלצות.
async function getRecommendationController(req, res) {
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
}

export { getRecommendationController, loadProducts };

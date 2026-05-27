// קורא את קובץ המוצרים המקומי בצורה אסינכרונית.
import { readFile } from "node:fs/promises";
// עוזר לחשב נתיבי קבצים כאשר עובדים עם ES modules.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// מפעיל את מנוע ההמלצות: Groq אם אפשר, וגיבוי מקומי אם צריך.
import { getRecommendations } from "../services/aiRecommendationService.js";
// מסנן מוצרים לפי פרופיל המשתמש לפני שלב ההמלצות.
import { filterProducts } from "../services/filterService.js";

// מחשב את תיקיית הקובץ הנוכחי כדי להגיע לקובץ הנתונים בצורה יציבה.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// מיקום קובץ המוצרים שממנו נטען את מאגר הפריטים.
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
    // גוף הבקשה הוא פרופיל המשתמש שעליו נבצע סינון והמלצה.
    const userProfile = req.body;
    const products = await loadProducts();
    // קודם מצמצמים את המאגר לפי חוקים קשיחים כמו תקציב, צבעים ואירוע.
    const filterResult = filterProducts(userProfile, products);
    // לאחר הסינון מבקשים המלצות מ-Groq או מהגיבוי המקומי.
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
    // שגיאות ולידציה או סינון חוזרות ללקוח כ-400 כדי להסביר מה לא תקין בבקשה.
    res.status(400).json({
      error: error.message,
    });
  }
}

export { getRecommendationController, loadProducts };

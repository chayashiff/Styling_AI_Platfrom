// assert משמש לבדיקות מדויקות של תוצאות הסינון וההמלצות.
import assert from "node:assert/strict";
// קורא את קובץ המוצרים האמיתי כדי לבדוק את הזרימה על נתונים קיימים.
import { readFile } from "node:fs/promises";
// מנגנון הבדיקות המובנה של Node.js.
import test from "node:test";
// פונקציות ה-AI נבדקות כאן בלי לבצע קריאה אמיתית ל-Groq.
import {
  buildRecommendationPrompt,
  getExpectedRecommendationsCount,
  validateRecommendationsResponse,
} from "../src/services/aiRecommendationService.js";
// הקונטרולר נבדק כדי לוודא שהנתיב החדש לטעינת המוצרים עובד אחרי הריפקטור.
import { loadProducts as loadControllerProducts } from "../src/controllers/recommendationController.js";
// שירות הסינון נבדק כדי לוודא שהמוצרים שנשלחים להמלצה עומדים בחוקים.
import { filterProducts } from "../src/services/filterService.js";
// שירות הגיבוי נבדק כדי לוודא שיש המלצות גם כש-Groq לא זמין.
import { rankWithFallback } from "../src/services/fallbackRecommendationService.js";

// טוען את מוצרי הבדיקה מתוך קובץ הנתונים של הפרויקט.
async function loadTestProducts() {
  const fileContent = await readFile(new URL("../src/data/products.json", import.meta.url));
  const productsData = JSON.parse(fileContent);

  return productsData.Products;
}

// יוצר פרופיל משתמש קבוע לבדיקות, עם אפשרות לשנות שדות לפי כל תרחיש.
function buildUserProfile(overrides = {}) {
  return {
    user_id: "u_123",
    age: 32,
    style_preferences: ["casual", "minimalist"],
    favorite_colors: ["black", "beige", "white"],
    avoid_colors: ["neon_yellow", "neon_pink"],
    occasion: "work_from_home",
    budget_max: 300,
    ...overrides,
  };
}

// בודק שה-controller מצליח לטעון את מאגר המוצרים מהנתיב החדש שלו.
test("controller loads products from the data file", async () => {
  const products = await loadControllerProducts();

  assert.ok(Array.isArray(products));
  assert.ok(products.length > 0);
});

// בודק את הזרימה הבסיסית: סינון מוצרים, דירוג fallback והוספת הסברים.
test("filters products, ranks up to 5 recommendations, and adds reasons", async () => {
  const products = await loadTestProducts();
  const userProfile = buildUserProfile();
  const filterResult = filterProducts(userProfile, products);
  const recommendations = rankWithFallback(userProfile, filterResult.products);

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.length <= 5);
  assert.ok(recommendations.every((product) => typeof product.reason === "string"));
});

// בודק שמנגנון הגיבוי לא מחזיר כמה וריאציות של אותו פריט.
test("skips duplicate fallback recommendations by product name and category", () => {
  const userProfile = buildUserProfile();
  const products = [
    {
      product_id: "p_001",
      name: "Soft Knit Cardigan",
      category: "tops",
      colors: ["black", "beige"],
      style_tags: ["casual", "minimalist"],
      occasions: ["work_from_home"],
      price: 80,
      description: "First cardigan variant",
    },
    {
      product_id: "p_002",
      name: "Soft Knit Cardigan",
      category: "tops",
      colors: ["black", "beige"],
      style_tags: ["casual", "minimalist"],
      occasions: ["work_from_home"],
      price: 90,
      description: "Second cardigan variant",
    },
    {
      product_id: "p_003",
      name: "Relaxed Linen Pants",
      category: "bottoms",
      colors: ["black"],
      style_tags: ["casual"],
      occasions: ["work_from_home"],
      price: 100,
      description: "Comfortable pants",
    },
  ];
  const recommendations = rankWithFallback(userProfile, products);

  assert.deepEqual(
    recommendations.map((product) => product.product_id),
    ["p_001", "p_003"],
  );
});

// בודק שכאשר נשארים פחות מ-5 מוצרים, Groq מתבקש להחזיר בדיוק את הכמות הקיימת.
test("asks Groq for the available product count when fewer than 5 products remain", () => {
  const userProfile = buildUserProfile();
  const products = [
    {
      product_id: "p_001",
      name: "Soft Knit Cardigan",
      category: "tops",
      colors: ["black"],
      style_tags: ["casual"],
      occasions: ["work_from_home"],
      price: 80,
      description: "Comfortable cardigan",
    },
    {
      product_id: "p_002",
      name: "Relaxed Linen Pants",
      category: "bottoms",
      colors: ["beige"],
      style_tags: ["minimalist"],
      occasions: ["work_from_home"],
      price: 100,
      description: "Comfortable pants",
    },
    {
      product_id: "p_003",
      name: "Classic White Tee",
      category: "tops",
      colors: ["white"],
      style_tags: ["casual"],
      occasions: ["work_from_home"],
      price: 40,
      description: "Simple tee",
    },
  ];
  const expectedRecommendationsCount = getExpectedRecommendationsCount(products);
  const prompt = buildRecommendationPrompt(
    userProfile,
    products,
    expectedRecommendationsCount,
  );
  const validResponse = {
    recommendations: products.map((product) => ({
      product_id: product.product_id,
      reason: "Fits the available filtered products.",
    })),
  };

  assert.equal(expectedRecommendationsCount, 3);
  assert.match(prompt, /select exactly 3 products/);
  assert.equal(
    validateRecommendationsResponse(
      validResponse,
      products,
      expectedRecommendationsCount,
    ),
    true,
  );
  assert.equal(getExpectedRecommendationsCount(new Array(6).fill({})), 5);
});

// בודק שתקציב נמוך מדי עוצר את הזרימה עם שגיאה ברורה.
test("throws when no products are within budget", async () => {
  const products = await loadTestProducts();
  const userProfile = buildUserProfile({ budget_max: 1 });

  assert.throws(
    () => filterProducts(userProfile, products),
    /No products found within your budget/,
  );
});

// בודק שמוצרים עם צבעים שהמשתמש ביקש להימנע מהם לא עוברים את הסינון.
test("removes products that include avoided colors", async () => {
  const products = await loadTestProducts();
  const userProfile = buildUserProfile({
    avoid_colors: ["neon_yellow", "neon_pink", "neon_green"],
    occasion: undefined,
  });
  const filterResult = filterProducts(userProfile, products);

  assert.ok(
    filterResult.products.every(
      (product) =>
        !product.colors.some((color) => userProfile.avoid_colors.includes(color)),
    ),
  );
});

// טוען משתני סביבה כדי שנוכל לקרוא את מפתח ה-API של Groq מתוך קובץ .env.
import "dotenv/config";
// מאפשר לשלוח בקשות למודל Groq שמייצר את ההמלצות החכמות.
import Groq from "groq-sdk";
// משמש כגיבוי מקומי אם Groq לא זמין או מחזיר תשובה לא תקינה.
import { rankWithFallback } from "./fallbackRecommendationService.js";

// קובע באיזה מודל Groq נשתמש ליצירת ההמלצות.
const GROQ_MODEL = "llama-3.3-70b-versatile";
// מגדיר תקרה לכמות ההמלצות כדי לשמור על תשובה ממוקדת למשתמש.
const MAX_RECOMMENDATIONS_COUNT = 5;

// הופך מערך לטקסט קריא בפרומפט, כדי שה-AI יקבל העדפות בצורה ברורה.
function formatList(value = []) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "None";
}

// מחשב כמה המלצות מותר לבקש: עד 5, ואם יש פחות מוצרים אז לפי הכמות שקיימת.
function getExpectedRecommendationsCount(filteredProducts) {
  return Math.min(MAX_RECOMMENDATIONS_COUNT, filteredProducts.length);
}

// בונה את הפרומפט שנשלח ל-Groq עם פרטי המשתמש, רשימת מוצרים וכללי דירוג.
function buildRecommendationPrompt(
  userProfile,
  filteredProducts,
  expectedRecommendationsCount,
) {
  return `You are a personal fashion stylist AI.

Your job is to select the ${expectedRecommendationsCount} most suitable products for this specific 
user from the list below.

USER PROFILE:
- Style preferences: ${formatList(userProfile.style_preferences)}
- Favorite colors: ${formatList(userProfile.favorite_colors)}
- Avoided colors: ${formatList(userProfile.avoid_colors)}
- Occasion: ${userProfile.occasion ?? "None"}
- Budget: ${userProfile.budget_max}
- Age: ${userProfile.age}

RANKING RULES - follow this priority order:
1. STYLE MATCH: Prefer products whose style_tags match MORE of the 
   user's style_preferences. A product matching 2 style tags ranks 
   higher than a product matching only 1 style tag.
2. COLOR MATCH: Prefer products whose colors list contains MORE of 
   the user's favorite_colors. A product with 2 matching colors 
   ranks higher than a product with only 1 matching color.
3. OCCASION MATCH: Prefer products whose occasions list includes 
   the user's occasion.
4. BUDGET: Prefer products that leave more budget remaining 
   (lower price relative to budget_max).

IMPORTANT RULES:
- You MUST select exactly ${expectedRecommendationsCount} products from the list below, no more, 
  no less
- You MUST only pick products that exist in the list below, never 
  invent products
- Every product you pick MUST match the user's occasion
- Every product you pick MUST cost less than or equal to 
  ${userProfile.budget_max}
- For each product write exactly one sentence explaining why it 
  suits this specific user based on their style, colors, and occasion

PRODUCTS LIST:
${JSON.stringify(filteredProducts, null, 2)}

RESPONSE FORMAT:
Return ONLY a valid JSON object, no extra text, no markdown, 
no explanation outside the JSON.
The JSON must follow this exact structure:
{
  "recommendations": [
    {
      "product_id": "p_001",
      "name": "product name",
      "category": "category",
      "colors": ["color1", "color2"],
      "style_tags": ["tag1", "tag2"],
      "occasions": ["occasion1"],
      "price": 89,
      "description": "original product description",
      "reason": "one sentence explaining why this suits the user"
    }
  ]
}`;
}

// מנקה עטיפות Markdown אם קיימות וממיר את תשובת Groq לאובייקט JSON.
function parseJsonResponse(content) {
  const cleanedContent = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleanedContent);
}

// מוודא ש-Groq החזיר את מספר ההמלצות הצפוי, מוצרים אמיתיים והסברים תקינים.
function validateRecommendationsResponse(
  parsedResponse,
  filteredProducts,
  expectedRecommendationsCount,
) {
  if (!Array.isArray(parsedResponse.recommendations)) {
    return false;
  }

  if (parsedResponse.recommendations.length !== expectedRecommendationsCount) {
    return false;
  }

  // בונה סט מזהים חוקיים כדי לוודא שה-AI לא המציא מוצרים שלא קיימים.
  const validProductIds = new Set(
    filteredProducts.map((product) => product.product_id),
  );
  // מונע החזרת אותו product_id יותר מפעם אחת בתשובת Groq.
  const selectedProductIds = new Set();

  return parsedResponse.recommendations.every((recommendation) => {
    const productId = recommendation.product_id;

    if (typeof productId !== "string" || !validProductIds.has(productId)) {
      return false;
    }

    if (selectedProductIds.has(productId)) {
      return false;
    }

    selectedProductIds.add(productId);

    return (
      typeof recommendation.reason === "string" &&
      recommendation.reason.trim() !== ""
    );
  });
}

// מחזיר את אובייקטי המוצרים המקוריים ומחליף רק את סיבת ההמלצה שהגיעה מ-Groq.
function mergeWithOriginalProducts(recommendations, filteredProducts) {
  const productsById = new Map(
    filteredProducts.map((product) => [product.product_id, product]),
  );

  return recommendations.map((recommendation) => ({
    ...productsById.get(recommendation.product_id),
    reason: recommendation.reason,
  }));
}

// מבצע את כל זרימת Groq: בניית פרומפט, קריאה למודל, פענוח, ולידציה ומיזוג תוצאות.
async function getGroqRecommendations(userProfile, filteredProducts) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const expectedRecommendationsCount =
    getExpectedRecommendationsCount(filteredProducts);
  const prompt = buildRecommendationPrompt(
    userProfile,
    filteredProducts,
    expectedRecommendationsCount,
  );
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response did not include content");
  }

  const parsedResponse = parseJsonResponse(content);

  if (
    !validateRecommendationsResponse(
      parsedResponse,
      filteredProducts,
      expectedRecommendationsCount,
    )
  ) {
    throw new Error("Groq response validation failed");
  }

  return mergeWithOriginalProducts(parsedResponse.recommendations, filteredProducts);
}

// מחזיר המלצות מ-Groq אם אפשר, ואם יש בעיה עובר אוטומטית לגיבוי המקומי.
async function getRecommendations(userProfile, filteredProducts) {
  try {
    // בלי מפתח API אין טעם לפנות ל-Groq, ולכן נעבור ישר ל-fallback.
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.trim() === "") {
      throw new Error("GROQ_API_KEY is missing");
    }

    return {
      source: "groq",
      recommendations: await getGroqRecommendations(userProfile, filteredProducts),
    };
  } catch (error) {
    console.warn("Groq recommendation failed, using fallback:", error.message);

    return {
      source: "local_fallback",
      recommendations: rankWithFallback(userProfile, filteredProducts),
    };
  }
}

export {
  buildRecommendationPrompt,
  getExpectedRecommendationsCount,
  getRecommendations,
  validateRecommendationsResponse,
};

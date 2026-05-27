// בודק את המלצות ה-AI מול פרופיל המשתמש והמוצרים המקוריים כדי לזהות בעיות.
function validateRecommendations(recommendations, userProfile, originalProducts) {
  console.log("🔍 Validating AI recommendations...");

  // אוסף פירוט לכל המלצה כדי שאפשר יהיה להבין בדיוק מה עבר ומה נכשל.
  const details = [];
  // מאפשר למצוא מוצר מקורי לפי product_id ולבדוק שה-AI לא המציא מוצר.
  const productsById = new Map(
    Array.isArray(originalProducts)
      ? originalProducts.map((product) => [product.product_id, product])
      : [],
  );
  // מגן מפני מצב שבו recommendations לא הגיע כמערך ומונע נפילה של הלולאה.
  const safeRecommendations = Array.isArray(recommendations)
    ? recommendations
    : [];

  // עובר על כל המלצה ובודק אותה מול כללי החובה וכללי האיכות.
  for (const recommendation of safeRecommendations) {
    const productId = recommendation?.product_id;
    const originalProduct = productsById.get(productId);
    // אם המוצר קיים במאגר, משתמשים בנתונים המקוריים שלו ובסיבת ההמלצה של ה-AI.
    const product = originalProduct
      ? { ...originalProduct, reason: recommendation.reason }
      : recommendation;
    // errors הם כשלים קשיחים שמבטלים את תקינות ההמלצה.
    const errors = [];
    // warnings הם סימני אזהרה שמראים המלצה חלשה אבל לא בהכרח לא חוקית.
    const warnings = [];

    // מוצר שלא קיים במאגר הוא כשל חמור כי אסור ל-AI להמציא מוצרים.
    if (!originalProduct) {
      errors.push("product does not exist in the database");
    }

    // מחיר מעל התקציב מפר את דרישת המשתמש ולכן ההמלצה לא תקינה.
    if (product?.price > userProfile.budget_max) {
      errors.push(`price ${product.price} exceeds budget ${userProfile.budget_max}`);
    }

    // צבע שהמשתמש ביקש להימנע ממנו פוסל את ההמלצה.
    for (const color of product?.colors ?? []) {
      if ((userProfile.avoid_colors ?? []).includes(color)) {
        errors.push(`product contains avoided color: ${color}`);
      }
    }

    // אם נבחר אירוע, המוצר חייב להתאים אליו.
    if (
      userProfile.occasion &&
      !(product?.occasions ?? []).includes(userProfile.occasion)
    ) {
      errors.push(`product does not match occasion: ${userProfile.occasion}`);
    }

    // כל המלצה חייבת לכלול סיבה כדי שהמשתמש יבין למה היא נבחרה.
    if (
      typeof product?.reason !== "string" ||
      product.reason.trim() === ""
    ) {
      errors.push("missing or empty reason");
    }

    // סופר התאמות סגנון כדי לזהות המלצות שהן פחות רלוונטיות למשתמש.
    const styleMatches = (product?.style_tags ?? []).filter((styleTag) =>
      (userProfile.style_preferences ?? []).includes(styleTag),
    ).length;

    // אין התאמת סגנון בכלל, לכן זו המלצה חלשה גם אם היא לא נפסלת.
    if (styleMatches === 0) {
      warnings.push("no style tags match user preferences");
    }

    // התאמה אחת בלבד מצביעה על המלצה בינונית שכדאי לשים לב אליה.
    if (styleMatches === 1) {
      warnings.push("only 1 style tag matches user preferences");
    }

    // סופר התאמות צבעים כדי לבדוק אם המוצר באמת מתאים לטעם הצבעוני של המשתמש.
    const colorMatches = (product?.colors ?? []).filter((color) =>
      (userProfile.favorite_colors ?? []).includes(color),
    ).length;

    // אם אין התאמת צבעים, זו לא פסילה אבל זו אזהרה על איכות ההמלצה.
    if (colorMatches === 0) {
      warnings.push("none of the product colors match user favorite colors");
    }

    // מדפיס כשלים כדי שיהיה קל לדבג למה המלצה נפסלה.
    if (errors.length > 0) {
      console.log("❌ Product failed:", productId, errors);
    }

    // מדפיס אזהרות כדי לזהות המלצות פחות חזקות בלי להפיל את כל התהליך.
    if (warnings.length > 0) {
      console.log("⚠️ Warning for:", productId, warnings);
    }

    // שומר סיכום מסודר של תוצאת הבדיקה עבור ההמלצה הנוכחית.
    details.push({
      product_id: productId,
      name: product?.name,
      price: product?.price,
      passedHardRules: errors.length === 0,
      errors,
      warnings,
    });
  }

  // מחשב כמה המלצות עברו וכמה נכשלו כדי לבנות תוצאת ולידציה כללית.
  const passedHardRules = details.filter((detail) => detail.passedHardRules).length;
  const failedHardRules = details.length - passedHardRules;
  // תקין רק אם התקבלו 5 המלצות וכולן עברו את כל חוקי החובה.
  const valid =
    safeRecommendations.length === 5 &&
    passedHardRules === 5 &&
    failedHardRules === 0;

  console.log("✅ Validation complete:", passedHardRules, "/5 passed");

  // מחזיר אובייקט מפורט שמאפשר לראות גם סטטוס כללי וגם פירוט לכל מוצר.
  return {
    valid,
    totalRecommendations: safeRecommendations.length,
    passedHardRules,
    failedHardRules,
    details,
  };
}

export { validateRecommendations };

// מאפשר שימוש בקובץ גם בסביבת CommonJS אם מריצים אותו בצורה ישנה יותר.
if (typeof module !== "undefined") {
  module.exports = { validateRecommendations };
}

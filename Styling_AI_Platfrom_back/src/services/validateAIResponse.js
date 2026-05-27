// בודק את המלצות ה-AI מול פרופיל המשתמש והמוצרים המקוריים כדי לזהות בעיות.
function validateRecommendations(recommendations, userProfile, originalProducts) {
  console.log("🔍 Validating AI recommendations...");

  const details = [];
  const productsById = new Map(
    Array.isArray(originalProducts)
      ? originalProducts.map((product) => [product.product_id, product])
      : [],
  );
  const safeRecommendations = Array.isArray(recommendations)
    ? recommendations
    : [];

  for (const recommendation of safeRecommendations) {
    const productId = recommendation?.product_id;
    const originalProduct = productsById.get(productId);
    const product = originalProduct
      ? { ...originalProduct, reason: recommendation.reason }
      : recommendation;
    const errors = [];
    const warnings = [];

    if (!originalProduct) {
      errors.push("product does not exist in the database");
    }

    if (product?.price > userProfile.budget_max) {
      errors.push(`price ${product.price} exceeds budget ${userProfile.budget_max}`);
    }

    for (const color of product?.colors ?? []) {
      if ((userProfile.avoid_colors ?? []).includes(color)) {
        errors.push(`product contains avoided color: ${color}`);
      }
    }

    if (
      userProfile.occasion &&
      !(product?.occasions ?? []).includes(userProfile.occasion)
    ) {
      errors.push(`product does not match occasion: ${userProfile.occasion}`);
    }

    if (
      typeof product?.reason !== "string" ||
      product.reason.trim() === ""
    ) {
      errors.push("missing or empty reason");
    }

    const styleMatches = (product?.style_tags ?? []).filter((styleTag) =>
      (userProfile.style_preferences ?? []).includes(styleTag),
    ).length;

    if (styleMatches === 0) {
      warnings.push("no style tags match user preferences");
    }

    if (styleMatches === 1) {
      warnings.push("only 1 style tag matches user preferences");
    }

    const colorMatches = (product?.colors ?? []).filter((color) =>
      (userProfile.favorite_colors ?? []).includes(color),
    ).length;

    if (colorMatches === 0) {
      warnings.push("none of the product colors match user favorite colors");
    }

    if (errors.length > 0) {
      console.log("❌ Product failed:", productId, errors);
    }

    if (warnings.length > 0) {
      console.log("⚠️ Warning for:", productId, warnings);
    }

    details.push({
      product_id: productId,
      name: product?.name,
      price: product?.price,
      passedHardRules: errors.length === 0,
      errors,
      warnings,
    });
  }

  const passedHardRules = details.filter((detail) => detail.passedHardRules).length;
  const failedHardRules = details.length - passedHardRules;
  const valid =
    safeRecommendations.length === 5 &&
    passedHardRules === 5 &&
    failedHardRules === 0;

  console.log("✅ Validation complete:", passedHardRules, "/5 passed");

  return {
    valid,
    totalRecommendations: safeRecommendations.length,
    passedHardRules,
    failedHardRules,
    details,
  };
}

export { validateRecommendations };

if (typeof module !== "undefined") {
  module.exports = { validateRecommendations };
}

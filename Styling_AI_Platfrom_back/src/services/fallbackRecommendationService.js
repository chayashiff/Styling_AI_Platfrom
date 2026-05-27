const MAX_RECOMMENDATIONS = 5;

// סופר כמה ערכים משותפים יש בין העדפות המשתמש לבין נתוני המוצר לצורך חישוב התאמה.
function countMatches(source = [], target = []) {
  const targetSet = new Set(target);

  return source.filter((item) => targetSet.has(item)).length;
}

// מחזיר את הערכים שבאמת התאימו כדי שנוכל להסביר למשתמש למה המוצר הומלץ.
function getMatchedValues(source = [], target = []) {
  const targetSet = new Set(target);

  return source.filter((item) => targetSet.has(item));
}

// יוצר זהות מוצר לפי שם וקטגוריה כדי למנוע כפילויות שנראות למשתמש כמו אותו פריט.
function getProductIdentity(product) {
  return `${product.name ?? ""}::${product.category ?? ""}`.toLowerCase().trim();
}

// מחשב ציון התאמה מקומי למוצר לפי סגנון, צבעים, אירוע ותקציב.
function scoreProduct(userProfile, product) {
  const styleMatches = countMatches(
    userProfile.style_preferences ?? [],
    product.style_tags,
  );
  const colorMatches = countMatches(userProfile.favorite_colors ?? [], product.colors);
  const occasionMatch = userProfile.occasion
    ? product.occasions.includes(userProfile.occasion)
    : false;
  const budgetRoom = Math.max(userProfile.budget_max - product.price, 0);
  const budgetScore = budgetRoom / userProfile.budget_max;

  return styleMatches * 3 + colorMatches * 2 + (occasionMatch ? 4 : 0) + budgetScore;
}

// בונה הסבר קצר וברור כדי שהמשתמש יבין למה דווקא המוצר הזה הומלץ.
function buildReason(userProfile, product) {
  const matchedStyles = getMatchedValues(
    userProfile.style_preferences ?? [],
    product.style_tags,
  );
  const matchedColors = getMatchedValues(
    userProfile.favorite_colors ?? [],
    product.colors,
  );
  const reasons = [];

  if (matchedStyles.length > 0) {
    reasons.push(`matches your ${matchedStyles.join(" and ")} style`);
  }

  if (matchedColors.length > 0) {
    reasons.push(`includes your preferred ${matchedColors.join(" and ")} colors`);
  }

  if (userProfile.occasion && product.occasions.includes(userProfile.occasion)) {
    reasons.push(`fits ${userProfile.occasion}`);
  }

  if (reasons.length === 0) {
    reasons.push("fits the details you shared and keeps the look polished");
  }

  return `Recommended because it ${reasons.join(", ")}.`;
}

// מדרג מוצרים מקומית ומשמש כגיבוי כש-Groq לא זמין או מחזיר תשובה לא תקינה.
function rankWithFallback(userProfile, products) {
  const rankedProducts = products
    .map((product) => ({
      product,
      score: scoreProduct(userProfile, product),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.product.price - second.product.price;
    });
  const selectedProductIdentities = new Set();
  const recommendations = [];

  for (const rankedProduct of rankedProducts) {
    const productIdentity = getProductIdentity(rankedProduct.product);

    if (selectedProductIdentities.has(productIdentity)) {
      continue;
    }

    selectedProductIdentities.add(productIdentity);
    recommendations.push(rankedProduct);

    if (recommendations.length === MAX_RECOMMENDATIONS) {
      break;
    }
  }

  return recommendations.map(({ product, score }) => ({
    ...product,
    score: Number(score.toFixed(2)),
    reason: buildReason(userProfile, product),
  }));
}

export { rankWithFallback };

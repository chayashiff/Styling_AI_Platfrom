const MAX_RECOMMENDATIONS = 5;

function countMatches(source = [], target = []) {
  const targetSet = new Set(target);

  return source.filter((item) => targetSet.has(item)).length;
}

function getMatchedValues(source = [], target = []) {
  const targetSet = new Set(target);

  return source.filter((item) => targetSet.has(item));
}

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
    reasons.push("is one of the strongest available matches after your filters");
  }

  return `Recommended because it ${reasons.join(", ")}.`;
}

function rankWithFallback(userProfile, products) {
  return products
    .map((product) => ({
      product,
      score: scoreProduct(userProfile, product),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.product.price - second.product.price;
    })
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ product, score }) => ({
      ...product,
      score: Number(score.toFixed(2)),
      reason: buildReason(userProfile, product),
    }));
}

export { rankWithFallback };

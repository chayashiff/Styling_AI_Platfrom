// קובע כמה המלצות מקסימום נחזיר למשתמש כדי לא להציף אותו.
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
  // התאמת סגנון מקבלת משקל גבוה כי היא משפיעה הכי הרבה על רלוונטיות ההמלצה.
  const styleMatches = countMatches(
    userProfile.style_preferences ?? [],
    product.style_tags,
  );
  // התאמת צבעים עוזרת להעדיף מוצרים בצבעים שהמשתמש אוהב.
  const colorMatches = countMatches(userProfile.favorite_colors ?? [], product.colors);
  // התאמה לאירוע מוודאת שהמוצר מתאים לשימוש שהמשתמש ביקש.
  const occasionMatch = userProfile.occasion
    ? product.occasions.includes(userProfile.occasion)
    : false;
  // מוצר שנשאר רחוק מתקרת התקציב מקבל בונוס קטן.
  const budgetRoom = Math.max(userProfile.budget_max - product.price, 0);
  const budgetScore = budgetRoom / userProfile.budget_max;

  return styleMatches * 3 + colorMatches * 2 + (occasionMatch ? 4 : 0) + budgetScore;
}

// בונה הסבר קצר וברור כדי שהמשתמש יבין למה דווקא המוצר הזה הומלץ.
function buildReason(userProfile, product) {
  // נשמור רק את הסגנונות והצבעים שבאמת נמצאו במוצר כדי שההסבר יהיה מדויק.
  const matchedStyles = getMatchedValues(
    userProfile.style_preferences ?? [],
    product.style_tags,
  );
  const matchedColors = getMatchedValues(
    userProfile.favorite_colors ?? [],
    product.colors,
  );
  const reasons = [];

  // מוסיף להסבר התאמות סגנון אם קיימות.
  if (matchedStyles.length > 0) {
    reasons.push(`matches your ${matchedStyles.join(" and ")} style`);
  }

  // מוסיף להסבר התאמות צבעים אם קיימות.
  if (matchedColors.length > 0) {
    reasons.push(`includes your preferred ${matchedColors.join(" and ")} colors`);
  }

  // מוסיף להסבר התאמה לאירוע המבוקש אם המוצר מתאים אליו.
  if (userProfile.occasion && product.occasions.includes(userProfile.occasion)) {
    reasons.push(`fits ${userProfile.occasion}`);
  }

  // אם אין התאמה מילולית חזקה, עדיין נסביר שהמוצר נבחר לפי הדירוג הכללי.
  if (reasons.length === 0) {
    reasons.push("is one of the strongest available matches after your filters");
  }

  return `Recommended because it ${reasons.join(", ")}.`;
}

// מדרג מוצרים מקומית ומשמש כגיבוי כש-Groq לא זמין או מחזיר תשובה לא תקינה.
function rankWithFallback(userProfile, products) {
  // מחשב ציון לכל מוצר ואז ממיין מההתאמה הגבוהה לנמוכה.
  const rankedProducts = products
    .map((product) => ({
      product,
      score: scoreProduct(userProfile, product),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      // במקרה של תיקו בציון, נעדיף את המוצר הזול יותר.
      return first.product.price - second.product.price;
    });
  // שומר זהויות שכבר נבחרו כדי שלא נחזיר כמה וריאציות של אותו פריט.
  const selectedProductIdentities = new Set();
  const recommendations = [];

  // עובר על הדירוג ובוחר רק מוצרים ייחודיים עד שמגיעים למקסימום ההמלצות.
  for (const rankedProduct of rankedProducts) {
    const productIdentity = getProductIdentity(rankedProduct.product);

    // אם מוצר עם אותו שם וקטגוריה כבר נבחר, מדלגים לפריט הבא בדירוג.
    if (selectedProductIdentities.has(productIdentity)) {
      continue;
    }

    selectedProductIdentities.add(productIdentity);
    recommendations.push(rankedProduct);

    if (recommendations.length === MAX_RECOMMENDATIONS) {
      break;
    }
  }

  // מחזיר את המוצרים בפורמט שהלקוח מצפה לו, כולל ציון מעוגל והסבר המלצה.
  return recommendations.map(({ product, score }) => ({
    ...product,
    score: Number(score.toFixed(2)),
    reason: buildReason(userProfile, product),
  }));
}

export { rankWithFallback };

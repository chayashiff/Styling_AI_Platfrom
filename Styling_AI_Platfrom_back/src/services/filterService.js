// בודק שערך הוא אובייקט רגיל כדי למנוע עבודה על null, מערך או טיפוס לא צפוי.
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// מוודא ששדה טקסט קיים ולא ריק, כדי שהנתונים יהיו מספיק איכותיים לסינון.
function assertString(value, fieldName, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${context}: ${fieldName} must be a non-empty string`);
  }
}

// מוודא שמספר חיובי באמת התקבל, למשל מחיר או תקציב מקסימלי.
function assertPositiveNumber(value, fieldName, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${context}: ${fieldName} must be a positive number`);
  }
}

// מוודא שמספר לא שלילי התקבל, למשל גיל שיכול להיות 0 אבל לא שלילי.
function assertNonNegativeNumber(value, fieldName, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new Error(`${context}: ${fieldName} must be a non-negative number`);
  }
}

// מאפשר שדה אופציונלי, אבל אם הוא קיים הוא חייב להיות מערך.
function assertOptionalArray(value, fieldName, context) {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`${context}: ${fieldName} must be an array`);
  }
}

// מוודא שמערכי חובה במוצר לא ריקים, כדי שיהיה לפי מה לסנן ולהמליץ.
function assertNonEmptyArray(value, fieldName, context) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${context}: ${fieldName} must be a non-empty array`);
  }
}

// יוצר טקסט שגיאה ברור למוצר לפי product_id או לפי המיקום שלו ברשימה.
function getProductContext(product, index) {
  const productId =
    isPlainObject(product) && typeof product.product_id === "string"
      ? product.product_id
      : `at index ${index}`;

  return `Invalid product ${productId}`;
}

// בודק שפרופיל המשתמש מכיל את כל השדות הנדרשים לפני שמתחילים לסנן מוצרים.
function validateUserProfile(userProfile) {
  if (!isPlainObject(userProfile)) {
    throw new Error("userProfile must be an object");
  }

  // שדות בסיסיים חייבים להיות תקינים כדי שהסינון וההמלצות לא יעבדו על מידע חסר.
  assertString(userProfile.user_id, "user_id", "Invalid userProfile");
  assertNonNegativeNumber(userProfile.age, "age", "Invalid userProfile");
  assertPositiveNumber(userProfile.budget_max, "budget_max", "Invalid userProfile");
  assertOptionalArray(
    userProfile.style_preferences,
    "style_preferences",
    "Invalid userProfile",
  );
  assertOptionalArray(
    userProfile.favorite_colors,
    "favorite_colors",
    "Invalid userProfile",
  );
  assertOptionalArray(
    userProfile.avoid_colors,
    "avoid_colors",
    "Invalid userProfile",
  );

  // occasion הוא אופציונלי, אבל אם נשלח הוא חייב להיות טקסט אמיתי.
  if (
    userProfile.occasion !== undefined &&
    (typeof userProfile.occasion !== "string" ||
      userProfile.occasion.trim() === "")
  ) {
    throw new Error("Invalid userProfile: occasion must be a non-empty string");
  }

  console.log("userProfile valid:", userProfile.user_id);
}

// בודק שכל מוצר במאגר עומד במבנה שהמערכת מצפה לו לפני שמפעילים עליו סינונים.
function validateProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("products must be a non-empty array");
  }

  // עוברים מוצר מוצר כדי לתת שגיאה מדויקת אם מוצר אחד לא תקין.
  products.forEach((product, index) => {
    const context = getProductContext(product, index);

    if (!isPlainObject(product)) {
      throw new Error(`${context}: product must be an object`);
    }

    assertString(product.product_id, "product_id", context);
    assertString(product.name, "name", context);
    assertNonEmptyArray(product.colors, "colors", context);
    assertNonEmptyArray(product.style_tags, "style_tags", context);
    assertNonEmptyArray(product.occasions, "occasions", context);
    assertPositiveNumber(product.price, "price", context);
    assertString(product.description, "description", context);
  });

  console.log("products loaded:", products.length);
}

// משאיר רק מוצרים שנמצאים בתוך התקציב של המשתמש.
function filterByBudget(products, budgetMax) {
  const filtered = products.filter((product) => product.price <= budgetMax);

  console.log("after budget filter:", filtered.length);

  if (filtered.length === 0) {
    throw new Error("No products found within your budget");
  }

  return filtered;
}

// מסיר מוצרים שמכילים צבעים שהמשתמש ביקש להימנע מהם.
function filterByAvoidedColors(products, avoidColors = []) {
  // Set מאפשר בדיקת צבעים מהירה ונקייה בזמן מעבר על מוצרי המאגר.
  const avoidedColorsSet = new Set(avoidColors);
  const filtered = products.filter(
    (product) => !product.colors.some((color) => avoidedColorsSet.has(color)),
  );

  console.log("after colors filter:", filtered.length);

  if (filtered.length === 0) {
    throw new Error("No products match your color preferences");
  }

  return filtered;
}

// אם המשתמש בחר אירוע, משאיר רק מוצרים שמתאימים לאותו שימוש.
function filterByOccasion(products, occasion) {
  // אם אין אירוע, אין צורך לצמצם את הרשימה לפי occasion.
  if (!occasion) {
    return products;
  }

  const filtered = products.filter((product) =>
    product.occasions.includes(occasion),
  );

  console.log("after occasion filter:", filtered.length);

  if (filtered.length === 0) {
    throw new Error("No products available for this occasion");
  }

  return filtered;
}

// מפעיל את כל שרשרת הסינון ומחזיר את המוצרים שנשארו לשליחה ל-Groq או ל-fallback.
function filterProducts(userProfile, products) {
  validateUserProfile(userProfile);
  validateProducts(products);

  // סדר הסינון חשוב: קודם תקציב, אחר כך צבעים אסורים, ובסוף התאמה לאירוע.
  let filteredProducts = filterByBudget(products, userProfile.budget_max);
  filteredProducts = filterByAvoidedColors(
    filteredProducts,
    userProfile.avoid_colors ?? [],
  );
  filteredProducts = filterByOccasion(filteredProducts, userProfile.occasion);

  console.log("final products to send:", filteredProducts.length);

  // אם נשארו פחות מ-5 מוצרים, נחזיר הודעה כדי שהלקוח יוכל להסביר זאת למשתמש.
  return {
    products: filteredProducts,
    message:
      filteredProducts.length < 5
        ? `Only ${filteredProducts.length} products match your profile`
        : undefined,
  };
}

export { filterProducts, validateProducts, validateUserProfile };

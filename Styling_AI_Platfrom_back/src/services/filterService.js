function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertString(value, fieldName, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${context}: ${fieldName} must be a non-empty string`);
  }
}

function assertPositiveNumber(value, fieldName, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${context}: ${fieldName} must be a positive number`);
  }
}

function assertNonNegativeNumber(value, fieldName, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new Error(`${context}: ${fieldName} must be a non-negative number`);
  }
}

function assertOptionalArray(value, fieldName, context) {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`${context}: ${fieldName} must be an array`);
  }
}

function assertNonEmptyArray(value, fieldName, context) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${context}: ${fieldName} must be a non-empty array`);
  }
}

function getProductContext(product, index) {
  const productId =
    isPlainObject(product) && typeof product.product_id === "string"
      ? product.product_id
      : `at index ${index}`;

  return `Invalid product ${productId}`;
}

function validateUserProfile(userProfile) {
  if (!isPlainObject(userProfile)) {
    throw new Error("userProfile must be an object");
  }

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

  if (
    userProfile.occasion !== undefined &&
    (typeof userProfile.occasion !== "string" ||
      userProfile.occasion.trim() === "")
  ) {
    throw new Error("Invalid userProfile: occasion must be a non-empty string");
  }

  console.log("userProfile valid:", userProfile.user_id);
}

function validateProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("products must be a non-empty array");
  }

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

function filterByBudget(products, budgetMax) {
  const filtered = products.filter((product) => product.price <= budgetMax);

  console.log("after budget filter:", filtered.length);

  if (filtered.length === 0) {
    throw new Error("No products found within your budget");
  }

  return filtered;
}

function filterByAvoidedColors(products, avoidColors = []) {
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

function filterByOccasion(products, occasion) {
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

function filterProducts(userProfile, products) {
  validateUserProfile(userProfile);
  validateProducts(products);

  let filteredProducts = filterByBudget(products, userProfile.budget_max);
  filteredProducts = filterByAvoidedColors(
    filteredProducts,
    userProfile.avoid_colors ?? [],
  );
  filteredProducts = filterByOccasion(filteredProducts, userProfile.occasion);

  console.log("final products to send:", filteredProducts.length);

  return {
    products: filteredProducts,
    message:
      filteredProducts.length < 5
        ? `Only ${filteredProducts.length} products match your profile`
        : undefined,
  };
}

export { filterProducts, validateProducts, validateUserProfile };

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { filterProducts } from "../src/services/filterService.js";
import { rankWithFallback } from "../src/services/fallbackRecommendationService.js";

async function loadTestProducts() {
  const fileContent = await readFile(new URL("../src/data/products.json", import.meta.url));
  const productsData = JSON.parse(fileContent);

  return productsData.Products;
}

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

test("filters products, ranks up to 5 recommendations, and adds reasons", async () => {
  const products = await loadTestProducts();
  const userProfile = buildUserProfile();
  const filterResult = filterProducts(userProfile, products);
  const recommendations = rankWithFallback(userProfile, filterResult.products);

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.length <= 5);
  assert.ok(recommendations.every((product) => typeof product.reason === "string"));
});

test("throws when no products are within budget", async () => {
  const products = await loadTestProducts();
  const userProfile = buildUserProfile({ budget_max: 1 });

  assert.throws(
    () => filterProducts(userProfile, products),
    /No products found within your budget/,
  );
});

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

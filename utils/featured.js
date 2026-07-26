// utils/featured.js
// Shared helpers for the "featured product" flag.
// The Product.featured field is a String, so historically it has held a mix of
// values. We treat a product as featured when the flag is a truthy-ish string.

// Maximum number of products that can be featured at once (drives the carousel).
export const MAX_FEATURED = 5;

// Canonical values written by the admin toggle.
export const FEATURED_ON = "true";
export const FEATURED_OFF = "";

// Values that count as "not featured".
const FALSEY = [null, undefined, "", "false", "False", "FALSE", "no", "No", "0"];

// Client/server-safe check for whether a product is featured.
export function isFeatured(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    return !FALSEY.includes(value.trim());
  }
  return false;
}

// Mongo filter that matches featured products (for admin listing + limit checks).
export const featuredQuery = {
  featured: { $exists: true, $nin: FALSEY },
};

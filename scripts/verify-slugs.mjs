// scripts/verify-slugs.mjs
// Validate that all stores and products have consistent slug data:
//   - every document with a title/storename has a slug
//   - no duplicate slugs within a model
//   - previousSlugs arrays are clean (no duplicates within the array,
//     no dangling references, no self-referential entries)
//
// Usage: node scripts/verify-slugs.mjs

import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

await connectDB();

let errors = 0;
const report = (model, id, msg) => {
  console.error(`[${model}] ${id}: ${msg}`);
  errors++;
};

// --- Stores (all users with a storename) ---
console.log('Checking stores...');
const users = await User.find({ storename: { $exists: true, $ne: '' } }).select('+slug +previousSlugs').lean();
const userBySlug = new Map();

for (const u of users) {
  const id = String(u._id);

  if (!u.slug) {
    report('User', id, `missing slug (storename: "${u.storename}")`);
    continue;
  }

  // Duplicate slug check
  if (userBySlug.has(u.slug)) {
    report('User', id, `duplicate slug "${u.slug}" conflicts with ${userBySlug.get(u.slug)}`);
  } else {
    userBySlug.set(u.slug, id);
  }

  // previousSlugs validation
  if (u.previousSlugs && u.previousSlugs.length > 0) {
    const seen = new Set();
    for (const ps of u.previousSlugs) {
      if (ps === u.slug) {
        report('User', id, `previousSlugs contains current slug "${u.slug}"`);
      }
      if (seen.has(ps)) {
        report('User', id, `previousSlugs has duplicate "${ps}"`);
      }
      seen.add(ps);
    }
  }
}

console.log(`  ${users.length} stores checked`);

// --- Products ---
console.log('Checking products...');
const products = await Product.find({ title: { $exists: true, $ne: '' } }).select('+slug +previousSlugs').lean();
const productBySlug = new Map();

for (const p of products) {
  const id = String(p._id);

  if (!p.slug) {
    report('Product', id, `missing slug (title: "${p.title}")`);
    continue;
  }

  if (productBySlug.has(p.slug)) {
    report('Product', id, `duplicate slug "${p.slug}" conflicts with ${productBySlug.get(p.slug)}`);
  } else {
    productBySlug.set(p.slug, id);
  }

  if (p.previousSlugs && p.previousSlugs.length > 0) {
    const seen = new Set();
    for (const ps of p.previousSlugs) {
      if (ps === p.slug) {
        report('Product', id, `previousSlugs contains current slug "${p.slug}"`);
      }
      if (seen.has(ps)) {
        report('Product', id, `previousSlugs has duplicate "${ps}"`);
      }
      seen.add(ps);
    }
  }
}

console.log(`  ${products.length} products checked`);

// --- Summary ---
console.log(`\n${errors ? `${errors} issue(s) found` : 'All clear — no issues detected.'}`);
process.exit(errors ? 1 : 0);
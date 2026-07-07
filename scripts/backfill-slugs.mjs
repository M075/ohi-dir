// Backfill slug + previousSlugs for existing stores (User卖家) and products.
// Seeds previousSlugs with the legacy _id string so any external links to
// /stores/<24-hex-id> or /products/<24-hex-id> keep working (route handlers
// 301 redirect them to the canonical slug URL).
//
// Usage: npm run migrate:slugs   (or: node scripts/backfill-slugs.mjs)

import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { toSlug, uniqueSlug } from '../utils/slugify.js';

await connectDB();

const summary = { stores: { scanned: 0, updated: 0 }, products: { scanned: 0, updated: 0 } };

// --- Stores (Users with role seller/admin) ---
console.log('Backfilling store slugs...');
const storeCursor = User.find({ role: { $in: ['seller', 'admin'] } }).cursor();

for await (const user of storeCursor) {
  summary.stores.scanned++;
  try {
    const idStr = String(user._id);
    const base = user.storename || `store-${idStr.slice(-6)}`;
    const root = toSlug(base) || `store-${idStr.slice(-6)}`;

    const exists = async (candidate, excludeId) => {
      const q = { slug: candidate };
      if (excludeId) q._id = { $ne: excludeId };
      const f = await User.findOne(q).select('_id').lean();
      return !!f;
    };

    let newSlug = user.slug;
    if (!newSlug) {
      newSlug = await uniqueSlug(root, exists, { excludeId: user._id });
    }

    const previousSlugs = Array.isArray(user.previousSlugs) ? [...user.previousSlugs] : [];
    if (!previousSlugs.includes(idStr)) previousSlugs.push(idStr);

    await User.updateOne(
      { _id: user._id },
      { $set: { slug: newSlug }, $setOnInsert: { previousSlugs } }
    );
    // Ensure previousSlugs is written even on existing docs:
    if (!user.previousSlugs || !user.previousSlugs.includes(idStr)) {
      await User.updateOne({ _id: user._id }, { $addToSet: { previousSlugs: idStr } });
    }

    summary.stores.updated++;
    if (summary.stores.updated % 50 === 0) {
      console.log(`  store ${summary.stores.updated}: ${user.storename} -> ${newSlug}`);
    }
  } catch (err) {
    console.warn(`Failed to backfill store ${user._id} (${user.storename}):`, err.message);
  }
}

// --- Products ---
console.log('Backfilling product slugs...');
const productCursor = Product.find({}).cursor();

for await (const prod of productCursor) {
  summary.products.scanned++;
  try {
    const idStr = String(prod._id);
    if (!prod.title) {
      console.warn(`  product ${idStr} has no title; skipping (slug stays empty)`);
      continue;
    }
    const root = toSlug(prod.title);

    const exists = async (candidate, excludeId) => {
      const q = { slug: candidate };
      if (excludeId) q._id = { $ne: excludeId };
      const f = await Product.findOne(q).select('_id').lean();
      return !!f;
    };

    let newSlug = prod.slug;
    if (!newSlug) {
      newSlug = await uniqueSlug(root, exists, { excludeId: prod._id });
    }

    const previousSlugs = Array.isArray(prod.previousSlugs) ? [...prod.previousSlugs] : [];
    if (!previousSlugs.includes(idStr)) previousSlugs.push(idStr);

    await Product.updateOne(
      { _id: prod._id },
      { $set: { slug: newSlug } }
    );
    if (!prod.previousSlugs || !prod.previousSlugs.includes(idStr)) {
      await Product.updateOne({ _id: prod._id }, { $addToSet: { previousSlugs: idStr } });
    }

    summary.products.updated++;
    if (summary.products.updated % 100 === 0) {
      console.log(`  product ${summary.products.updated}: ${prod.title} -> ${newSlug}`);
    }
  } catch (err) {
    console.warn(`Failed to backfill product ${prod._id} (${prod.title}):`, err.message);
  }
}

console.log('\nBackfill summary:');
console.log(`  stores:   scanned ${summary.stores.scanned}, updated ${summary.stores.updated}`);
console.log(`  products: scanned ${summary.products.scanned}, updated ${summary.products.updated}`);
console.log('\nDone. Legacy ObjectId URLs remain resolvable via previousSlugs.');
process.exit(0);

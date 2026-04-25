import connectDB from '../config/database.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Backfill ownerName for existing products
// Usage: node scripts/backfill-ownerName.mjs

await connectDB();

console.log('Starting backfill of ownerName for products...');

const filter = { $or: [ { ownerName: { $exists: false } }, { ownerName: "" } ] };
const cursor = Product.find(filter).cursor();
let count = 0;
let updated = 0;

for await (const prod of cursor) {
  count++;
  if (!prod.owner) continue;
  try {
    const user = await User.findById(prod.owner).select('storename');
    if (user && user.storename) {
      await Product.updateOne({ _id: prod._id }, { $set: { ownerName: user.storename } });
      updated++;
      if (updated % 50 === 0) console.log(`Updated ${updated} products...`);
    }
  } catch (err) {
    console.warn(`Failed to update product ${prod._id}:`, err.message);
  }
}

console.log(`Backfill complete. Scanned ${count} products, updated ${updated} products.`);
process.exit(0);

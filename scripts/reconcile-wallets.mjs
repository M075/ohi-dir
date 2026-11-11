// scripts/reconcile-wallets.mjs — Daily wallet balance reconciliation
//
// Compares each wallet's availableBalance against the sum of its completed
// ledger transactions and reports any drift. Run as a cron job (e.g. daily)
// to catch application bugs or missed balance updates.
//
// Usage:
//   node scripts/reconcile-wallets.mjs
//
import 'dotenv/config';
import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const wallets = await Wallet.find().lean();
  let driftCount = 0;
  let checked = 0;

  for (const wallet of wallets) {
    checked++;

    // Sum completed credits (sales) and debits (payouts/refunds) from the
    // embedded transaction array. These are the source of truth for balance.
    const completedCredits = (wallet.transactions || [])
      .filter(t => t.status === 'completed' && t.type === 'sale')
      .reduce((sum, t) => sum + (t.net || 0), 0);

    const completedDebits = (wallet.transactions || [])
      .filter(
        t =>
          t.status === 'completed' &&
          (t.type === 'payout' || t.type === 'refund')
      )
      .reduce((sum, t) => sum + Math.abs(t.net || 0), 0);

    const expectedAvailable = completedCredits - completedDebits;
    const actualAvailable = wallet.availableBalance || 0;
    const diff = Math.abs(expectedAvailable - actualAvailable);

    if (diff > 0.01) {
      driftCount++;
      console.warn(
        `Drift detected: sellerId=${wallet.seller} ` +
        `expected=${expectedAvailable.toFixed(2)} ` +
        `actual=${actualAvailable.toFixed(2)} ` +
        `diff=${diff.toFixed(2)}`
      );
    }
  }

  console.log(
    `\nReconciliation complete. ${checked} wallets checked, ${driftCount} with balance drift.`
  );

  if (driftCount > 0) {
    console.log(
      'Review the warnings above. Drift usually means a balance was updated ' +
      'without the matching transaction, or vice versa.'
    );
    process.exit(0);
  }

  await mongoose.disconnect();
}

main().catch(async error => {
  console.error('Reconciliation failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

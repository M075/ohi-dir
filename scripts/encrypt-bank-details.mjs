// scripts/encrypt-bank-details.mjs
//
// One-off migration for the Phase 2 security work.
//
//   1. Encrypts any plaintext bank account numbers stored on Wallet and Payout
//      documents, using FIELD_ENCRYPTION_KEY.
//   2. Removes the dead `bankDetails` sub-document from User documents. That
//      copy was never read by any code path and was being published by the
//      public store endpoints.
//
// Safe to re-run: already-encrypted values are skipped.
//
// Usage:
//   node scripts/encrypt-bank-details.mjs          # report only
//   node scripts/encrypt-bank-details.mjs --apply  # write changes

import 'dotenv/config';
import mongoose from 'mongoose';
import { encryptField, isEncrypted, isEncryptionConfigured } from '../utils/fieldEncryption.js';

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }
  if (!isEncryptionConfigured()) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY is not set. Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  const db = mongoose.connection.db;
  const summary = { wallets: 0, payouts: 0, users: 0 };

  // --- Wallets ------------------------------------------------------------
  const wallets = await db.collection('wallets')
    .find({ 'bankDetails.accountNumber': { $exists: true, $nin: [null, ''] } })
    .toArray();

  for (const wallet of wallets) {
    const current = wallet.bankDetails.accountNumber;
    if (isEncrypted(current)) continue;

    summary.wallets++;
    if (APPLY) {
      await db.collection('wallets').updateOne(
        { _id: wallet._id },
        { $set: { 'bankDetails.accountNumber': encryptField(current) } }
      );
    }
  }

  // --- Payouts ------------------------------------------------------------
  const payouts = await db.collection('payouts')
    .find({ 'bankDetails.accountNumber': { $exists: true, $nin: [null, ''] } })
    .toArray();

  for (const payout of payouts) {
    const current = payout.bankDetails.accountNumber;
    if (isEncrypted(current)) continue;

    summary.payouts++;
    if (APPLY) {
      await db.collection('payouts').updateOne(
        { _id: payout._id },
        { $set: { 'bankDetails.accountNumber': encryptField(current) } }
      );
    }
  }

  // --- Users: drop the duplicate, never-read copy -------------------------
  const staleUsers = await db.collection('users')
    .countDocuments({ bankDetails: { $exists: true } });

  summary.users = staleUsers;
  if (APPLY && staleUsers) {
    await db.collection('users').updateMany(
      { bankDetails: { $exists: true } },
      { $unset: { bankDetails: '' } }
    );
  }

  console.log(`Wallet account numbers to encrypt: ${summary.wallets}`);
  console.log(`Payout account numbers to encrypt: ${summary.payouts}`);
  console.log(`User documents with stale bankDetails to drop: ${summary.users}`);

  if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to write these changes.');
  } else {
    console.log('\nDone.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

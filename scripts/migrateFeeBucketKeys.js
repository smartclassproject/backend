/**
 * One-time: backfill StudentFeeAccount.feeBucketKey, drop legacy unique index
 * { schoolId, studentId, academicYear, term }, sync schema indexes.
 *
 * From backend/: `node scripts/migrateFeeBucketKeys.js`
 * Requires MONGODB_URI in .env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const StudentFeeAccount = require('../models/StudentFeeAccount');

const SEASONS = new Set(['fall', 'spring', 'summer', 'winter']);

function feeBucketKeyForDoc(doc) {
  if (doc.feeBucketKey && String(doc.feeBucketKey).trim()) return String(doc.feeBucketKey).trim();
  const season = doc.enrollmentSeason ? String(doc.enrollmentSeason).toLowerCase() : '';
  const cy = doc.enrollmentCohortYear;
  if (season && SEASONS.has(season) && cy != null && cy !== '' && !Number.isNaN(Number(cy))) {
    return `${season}-${Number(cy)}`;
  }
  if (doc.academicYear != null || doc.term != null) {
    return `legacy-${doc.academicYear ?? 'null'}-t${doc.term ?? 'null'}`;
  }
  return 'school-wide';
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('studentfeeaccounts');

  const cursor = col.find({
    $or: [{ feeBucketKey: { $exists: false } }, { feeBucketKey: null }, { feeBucketKey: '' }],
  });
  let n = 0;
  // eslint-disable-next-line no-await-in-loop
  for await (const doc of cursor) {
    const key = feeBucketKeyForDoc(doc);
    // eslint-disable-next-line no-await-in-loop
    await col.updateOne({ _id: doc._id }, { $set: { feeBucketKey: key } });
    n += 1;
  }
  console.log('Accounts backfilled (feeBucketKey):', n);

  const legacyName = 'schoolId_1_studentId_1_academicYear_1_term_1';
  try {
    // eslint-disable-next-line no-await-in-loop
    await col.dropIndex(legacyName);
    console.log('Dropped index:', legacyName);
  } catch (e) {
    console.log('Drop legacy index (ok if missing):', e.message || e);
  }

  await StudentFeeAccount.syncIndexes();
  console.log('StudentFeeAccount indexes synced');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

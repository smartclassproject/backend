/**
 * One-time migration: legacy Student.semester (term index) → entryTerm;
 * add enrollmentSeason / enrollmentCohortYear where missing;
 * ensure schools have enrollmentSemestersEnabled in MongoDB.
 *
 * Usage: from backend/, `node scripts/migrateStudentSemestersToTerms.js`
 * Requires MONGODB_URI in .env
 */
require('dotenv').config();
const mongoose = require('mongoose');

const SEASONS = ['fall', 'spring', 'summer', 'winter'];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const schools = db.collection('schools');
  const schoolRes = await schools.updateMany(
    {
      $or: [
        { enrollmentSemestersEnabled: { $exists: false } },
        { enrollmentSemestersEnabled: { $size: 0 } }
      ]
    },
    { $set: { enrollmentSemestersEnabled: SEASONS } }
  );
  console.log('Schools updated (missing enrollment semesters):', schoolRes.modifiedCount);

  const students = db.collection('students');
  const cursor = students.find({});
  let updated = 0;
  // eslint-disable-next-line no-await-in-loop
  for await (const doc of cursor) {
    const $set = {};
    const $unset = {};

    if (doc.semester != null && typeof doc.semester === 'number') {
      if (doc.entryTerm == null) $set.entryTerm = doc.semester;
      $unset.semester = '';
    } else if (doc.entryTerm == null) {
      $set.entryTerm = 1;
    }

    const hasSeason =
      doc.enrollmentSeason && SEASONS.includes(String(doc.enrollmentSeason).toLowerCase());
    if (!hasSeason) {
      $set.enrollmentSeason = 'fall';
    }

    if (doc.enrollmentCohortYear == null || doc.enrollmentCohortYear === undefined) {
      const cohort = doc.academicYear ?? doc.enrollmentYear;
      if (typeof cohort === 'number' && cohort >= 2000 && cohort <= 2100) {
        $set.enrollmentCohortYear = cohort;
      } else if (doc.enrollmentDate) {
        const y = new Date(doc.enrollmentDate).getFullYear();
        if (y >= 2000 && y <= 2100) $set.enrollmentCohortYear = y;
      } else {
        $set.enrollmentCohortYear = new Date().getFullYear();
      }
    }

    if (Object.keys($set).length === 0 && Object.keys($unset).length === 0) continue;

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    // eslint-disable-next-line no-await-in-loop
    await students.updateOne({ _id: doc._id }, update);
    updated += 1;
  }

  console.log('Students touched:', updated);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

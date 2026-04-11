const crypto = require('crypto');
const Student = require('../models/Student');

function deriveSchoolShort(school) {
  if (!school) return 'SC';
  const code = (school.shortCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length >= 2) return code.slice(0, 6);
  const words = (school.name || '').split(/\s+/).filter(Boolean);
  let fromName = words.map((w) => w[0]).join('').toUpperCase().replace(/[^A-Z]/g, '');
  if (fromName.length < 2) {
    fromName = (school.name || 'School').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
  }
  return (fromName || 'SC').padEnd(2, 'X').slice(0, 6);
}

function randomThreeDigits() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function randomThreeLetters() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 3 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
}

/**
 * Format: {SCHOOL-short}{yy}{3digits}{3letters} e.g. KGSY26042ABK
 */
async function generateUniqueStudentId(schoolDoc) {
  const short = deriveSchoolShort(schoolDoc);
  const yy = String(new Date().getFullYear()).slice(-2);
  for (let i = 0; i < 100; i += 1) {
    const candidate = `${short}${yy}${randomThreeDigits()}${randomThreeLetters()}`;
    const exists = await Student.findOne({ studentId: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Could not generate a unique student ID');
}

module.exports = { generateUniqueStudentId, deriveSchoolShort };

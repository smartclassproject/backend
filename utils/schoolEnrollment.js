const ENROLLMENT_SEASONS = ['fall', 'spring', 'summer', 'winter'];

/**
 * Deduplicate and filter to allowed lowercase season keys.
 * @param {unknown} arr
 * @returns {string[]}
 */
function normalizeEnrollmentSemestersEnabled(arr) {
  if (!Array.isArray(arr)) return [];
  const allowed = new Set(ENROLLMENT_SEASONS);
  return [...new Set(arr.map((s) => String(s).toLowerCase()).filter((s) => allowed.has(s)))];
}

/**
 * Seasons a school offers on registration (fallback if unset in DB).
 * @param {import('mongoose').Document | { enrollmentSemestersEnabled?: string[] }} schoolDoc
 * @returns {string[]}
 */
function seasonsEnabledForSchoolDoc(schoolDoc) {
  const n = normalizeEnrollmentSemestersEnabled(schoolDoc?.enrollmentSemestersEnabled);
  return n.length ? n : [...ENROLLMENT_SEASONS];
}

module.exports = {
  ENROLLMENT_SEASONS,
  normalizeEnrollmentSemestersEnabled,
  seasonsEnabledForSchoolDoc
};

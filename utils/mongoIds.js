/**
 * Stable string id for Mongo refs: plain ObjectId, string id, or populated doc with _id.
 */
function refIdString(ref) {
  if (ref == null) return '';
  if (typeof ref === 'object' && ref._id != null) return String(ref._id);
  return String(ref);
}

module.exports = { refIdString };

function validateIncidentType(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.name !== 'string' || data.name.trim().length === 0) return false;
  if (data.description && typeof data.description !== 'string') return false;
  return true;
}

module.exports = {
  validateIncidentType,
}; 
// Splits the `error.details` of a 400 ValidationException ({ field: ["msg"] })
// into messages that can sit next to a form field and messages that cannot.
//
// `fields` are the form's field names. Keys are matched case-insensitively,
// because the backend may name them after the request field or the CSV header.
// Anything that matches no field is returned in `otherErrors` so it is still
// shown, in the form-level alert, instead of being dropped.
export function splitFieldErrors(details, fields = []) {
  const fieldErrors = {};
  const otherErrors = [];
  if (!details) return { fieldErrors, otherErrors };

  const toText = (value) => (Array.isArray(value) ? value : [value])
    .filter((v) => v != null && v !== '')
    .map(String)
    .join(' ');

  if (Array.isArray(details) || typeof details !== 'object') {
    const text = toText(details);
    if (text) otherErrors.push(text);
    return { fieldErrors, otherErrors };
  }

  const byLowerName = Object.fromEntries(fields.map((f) => [f.toLowerCase(), f]));
  for (const [key, value] of Object.entries(details)) {
    const text = toText(value);
    if (!text) continue;
    const field = byLowerName[String(key).toLowerCase()];
    if (field) fieldErrors[field] = text;
    else otherErrors.push(`${key}: ${text}`);
  }
  return { fieldErrors, otherErrors };
}

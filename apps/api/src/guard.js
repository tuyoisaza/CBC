/**
 * Deterministic brand output guard.
 * The SYSTEM_PROMPT in generators/copy.js is the *input* guard; this is the
 * *output* guard — a cheap validator run before anything publishes, so an
 * off-brand caption never ships unsupervised (the "3am drift" failure mode).
 * Rules mirror the NEVER list documented in the system prompt.
 */

// Never-words (per brand voice: show quality with specificity, don't claim it)
const FORBIDDEN_WORDS = [
  'premium',
  'artesanal',
  'de calidad',
  'delicioso',
  'deliciosa',
  'único',
  'única',
  'unico',
  'unica',
  'para todos',
  'descuento',
];

// Never mention Lorena's Colombian origin
const FORBIDDEN_PATTERNS = [
  { re: /colombia/i, label: 'menciona origen colombiano' },
];

const MAX_HASHTAGS = 2;

/**
 * Validate a generated caption against the brand NEVER list.
 * Returns { ok: boolean, violations: string[] }
 */
function validateCaption(caption) {
  const violations = [];
  const lower = caption.toLowerCase();

  for (const word of FORBIDDEN_WORDS) {
    // Word-boundary-ish match; \b doesn't handle accented chars, so pad manually
    const re = new RegExp(`(^|[^a-záéíóúñü])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-záéíóúñü])`, 'i');
    if (re.test(lower)) violations.push(`palabra prohibida: "${word}"`);
  }

  for (const { re, label } of FORBIDDEN_PATTERNS) {
    if (re.test(caption)) violations.push(label);
  }

  const hashtags = caption.match(/#[\wáéíóúñü]+/gi) || [];
  if (hashtags.length > MAX_HASHTAGS) {
    violations.push(`${hashtags.length} hashtags (máximo ${MAX_HASHTAGS})`);
  }

  return { ok: violations.length === 0, violations };
}

module.exports = { validateCaption };

// utils/slugify.js
// URL-safe slug generation and slug/ObjectId resolution helpers.

const HEX_OID = /^[0-9a-f]{24}$/i;

export function isObjectId(value) {
  return HEX_OID.test(String(value || ''));
}

// Convert arbitrary text into a URL-safe lowercase slug.
export function toSlug(text) {
  return String(text || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate a unique slug, appending -2, -3, ... when needed.
// `exists`: async (candidate, excludeId?) => boolean
// Returns the unique slug string, or throws if maxTries exceeded.
export async function uniqueSlug(base, exists, { excludeId = null, maxTries = 50 } = {}) {
  const root = toSlug(base) || 'item';
  let candidate = root;
  let n = 2;
  while (await exists(candidate, excludeId)) {
    candidate = `${root}-${n++}`;
    if (n - 2 >= maxTries) {
      throw new Error(`Unable to generate a unique slug for "${base}" after ${maxTries} attempts`);
    }
  }
  return candidate;
}

// Resolve a store (User with role 'seller') by slug, previousSlug, or ObjectId.
// Returns { doc, canonicalSlug, redirectNeeded } or null if not found.
// `redirectNeeded` is true when the user-facing identifier (passed in) is not
// the current canonical slug — caller should 301 redirect to the canonical URL.
export async function resolveStore(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;

  const User = (await import('@/models/User')).default;

  let doc = null;

  if (isObjectId(id)) {
    doc = await User.findById(id).lean().select('+slug +previousSlugs');
    if (!doc) return null;
    if (!doc.slug) return { doc, canonicalSlug: doc.slug || id, redirectNeeded: false };
    return { doc, canonicalSlug: doc.slug, redirectNeeded: true };
  }

  doc = await User.findOne({ slug: id }).lean();
  if (doc) return { doc, canonicalSlug: doc.slug, redirectNeeded: false };

  doc = await User.findOne({ previousSlugs: id }).lean();
  if (doc) return { doc, canonicalSlug: doc.slug, redirectNeeded: true };

  return null;
}

// Resolve a product by slug, previousSlug, or ObjectId.
export async function resolveProduct(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;

  const Product = (await import('@/models/Product')).default;

  let doc = null;

  if (isObjectId(id)) {
    doc = await Product.findById(id).lean();
    if (!doc) return null;
    if (!doc.slug) return { doc, canonicalSlug: doc.slug || id, redirectNeeded: false };
    return { doc, canonicalSlug: doc.slug, redirectNeeded: true };
  }

  doc = await Product.findOne({ slug: id }).lean();
  if (doc) return { doc, canonicalSlug: doc.slug, redirectNeeded: false };

  doc = await Product.findOne({ previousSlugs: id }).lean();
  if (doc) return { doc, canonicalSlug: doc.slug, redirectNeeded: true };

  return null;
}

// Resolve a store or product to its raw ObjectId string (for use inside
// endpoints that need to do DB writes by _id, e.g. likes/reviews). Throws nothing;
// returns null on miss.
export async function resolveStoreId(identifier) {
  const r = await resolveStore(identifier);
  return r ? String(r.doc._id) : null;
}

export async function resolveProductId(identifier) {
  const r = await resolveProduct(identifier);
  return r ? String(r.doc._id) : null;
}

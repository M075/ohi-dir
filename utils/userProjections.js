// utils/userProjections.js
//
// Central definition of which User fields may leave the server, and which a
// user may set on themselves.
//
// These used to be expressed as blocklists (`.select('-bookmarks -email')`),
// which fails open: every field added to the schema afterwards was published
// by default. That is how seller bank details, home addresses, GPS
// coordinates and password-reset tokens ended up on public endpoints. Always
// name what goes out, never what stays in.

/**
 * Safe to show to anyone, signed in or not. This is what a storefront needs.
 */
export const PUBLIC_USER_FIELDS = [
  '_id',
  'storename',
  'slug',
  'image',
  'coverImage',
  'about',
  'city',
  'province',
  'country',
  'role',
  'isVerifiedSeller',
  'likes',
  'createdAt',
].join(' ');

/**
 * The stores map needs the pin coordinates on top of the public shape.
 *
 * Kept out of PUBLIC_USER_FIELDS on purpose: these are the seller's own
 * geocoded home address, and this list is what leaves the server on public
 * endpoints. Only the stores list route uses this projection, and it coarsens
 * the values before responding — see coarsenCoordinate().
 */
export const STORE_MAP_FIELDS = [
  PUBLIC_USER_FIELDS,
  'latitude',
  'longitude',
].join(' ');

/**
 * Coarsen a coordinate to a ~1 km grid.
 *
 * The map only needs a pin somewhere sensible in a city, not a house. Two
 * decimal places is about 1.1 km of latitude and 1.0 km of longitude at
 * South African latitudes, which keeps the pin on the right side of the city
 * without publishing a position that can be pointed at a door. Returns null
 * for missing or non-numeric input so the caller can drop the pin entirely
 * rather than plot it at null island.
 */
export function coarsenCoordinate(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const factor = 10 ** decimals;
  const rounded = Math.round(num * factor) / factor;
  // Normalise -0 to 0 so callers can use a plain truthiness check.
  return rounded === 0 ? 0 : rounded;
}

/**
 * Additionally visible to the account owner and to admins: contact details and
 * onboarding state. Still excludes credentials, tokens, and admin grants —
 * nothing here should be settable or readable as a route to privilege.
 */
export const OWNER_USER_FIELDS = [
  PUBLIC_USER_FIELDS,
  'email',
  'phone',
  'address',
  'zipCode',
  'latitude',
  'longitude',
  'geocodedAddress',
  'geocodedAt',
  'isOnboarded',
  'onboardingStep',
  'isEmailVerified',
  'isActive',
  'authProvider',
  'updatedAt',
].join(' ');

/**
 * The only fields a user may change on their own profile.
 *
 * Deliberately absent: role, isAdmin, adminRole, adminPermissions,
 * isVerifiedSeller, isActive, email, password, slug, likes. Spreading a
 * request body over the document let any signed-in user promote themselves to
 * super_admin by POSTing `{"isAdmin": true}` at their own id.
 *
 * Role changes go through /api/users/update-role, which validates the target
 * value; verification and admin grants are admin-only operations.
 */
export const USER_UPDATABLE_FIELDS = [
  'storename',
  'phone',
  'about',
  'address',
  'city',
  'province',
  'zipCode',
  'country',
  'image',
  'coverImage',
  'latitude',
  'longitude',
  'geocodedAddress',
  'geocodedAt',
  'isOnboarded',
  'onboardingStep',
];

/**
 * Build an update object containing only the fields a user is allowed to set.
 * Unknown keys are dropped silently — they are almost always either a stale
 * client or an escalation attempt, and neither should reach the database.
 */
export function pickUpdatableUserFields(body = {}) {
  const update = {};
  for (const field of USER_UPDATABLE_FIELDS) {
    if (body[field] !== undefined) {
      update[field] = body[field];
    }
  }
  return update;
}

/**
 * Reduce an already-fetched user document (including a `.lean()` result, where
 * Mongoose returns raw BSON and schema-level `select: false` does not apply)
 * to its public shape.
 */
export function toPublicUser(user) {
  if (!user) return null;
  const allowed = PUBLIC_USER_FIELDS.split(' ');
  const result = {};
  for (const field of allowed) {
    if (user[field] !== undefined) result[field] = user[field];
  }
  return result;
}

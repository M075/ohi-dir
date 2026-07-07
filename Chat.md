Create utils/slugify.js with toSlug, uniqueSlug, isObjectId, resolvers
Add slug + previousSlugs fields + pre-save hook to models/User.js
Add slug + previousSlugs fields + pre-save hook to models/Product.js
Write scripts/backfill-slugs.js to populate existing docs
Update app/api/stores/[id]/route.js with resolver + 301 redirect
Update app/api/products/[id]/route.js with resolver + 301 redirect
Update /api/stores/[id]/likes and /api/products/[id]/likes routes to accept slug or _id
Update /api/products/[id]/reviews route to accept slug or _id
Update /api/products/user/[userId] to accept slug or _id
Update page.jsx files (stores, products) to fetch using param as slug
Sweep front-end Link href + fetch URL builders to use slug for stores
Sweep front-end Link href + fetch URL builders to use slug for products
Update email/notification URL builders in route2.js and gdrive-route.js
Write scripts/verify-slugs.js validation script
Run lint/typecheck if available
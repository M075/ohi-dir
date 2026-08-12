// app/api/cron/expire-pending-orders/route.js
import { expirePendingOrders } from '@/utils/expirePendingOrders';

/**
 * Scheduled cleanup for abandoned PayFast checkouts.
 *
 * The actual work lives in utils/expirePendingOrders.js, which is shared with
 * the opportunistic sweep that runs off organic traffic.
 *
 * On Vercel's Hobby plan, cron jobs may only run once per day and fire
 * anywhere within the scheduled hour, so this endpoint is a safety net rather
 * than the primary mechanism — see maybeExpirePendingOrders(). It is still
 * worth keeping: it catches a backlog that accumulated while the site had no
 * traffic, which is exactly when the opportunistic path never fires.
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron requests,
 * so set CRON_SECRET in the project's environment variables to enable it. The
 * same header lets an external scheduler (GitHub Actions, cron-job.org) drive
 * it more frequently than Hobby cron allows.
 */

// Route handlers can be cached by Next; force this one to run on every request.
export const dynamic = 'force-dynamic';

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, refuse rather than run unauthenticated.
  if (!secret) return false;
  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Larger batch than the opportunistic path: this runs on its own, with no
    // user waiting on the response.
    const result = await expirePendingOrders({ limit: 500 });
    console.log('⏰ Expire pending orders:', result);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Expire pending orders error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to expire pending orders' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

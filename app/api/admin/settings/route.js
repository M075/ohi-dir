import connectDB from '@/config/database';
import Setting from '@/models/Setting';
import { getSessionUser } from '@/utils/getSessionUser';

// Helper function to send JSON responses
const jsonResponse = (data, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        'Content-Type': 'application/json',
      } 
    }
  );
};

// GET - Fetch settings
export async function GET(request) {
  try {
    await connectDB();

    // Find the first settings document or create one if it doesn't exist
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({ taxEnabled: true, commissionPercentage: 15 });
    }

    return jsonResponse(settings);
  } catch (error) {
    console.error('Settings GET error:', error);
    return jsonResponse({ error: 'Failed to fetch settings' }, 500);
  }
}

// POST - Update settings
export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // Verify admin status
    if (!sessionUser?.user || (sessionUser.user.role !== 'admin' && !sessionUser.user.isAdmin)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await request.json();
    const { taxEnabled, commissionPercentage } = body;

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (typeof taxEnabled === 'boolean') {
      settings.taxEnabled = taxEnabled;
    }

    if (typeof commissionPercentage === 'number') {
      // Clamp between 0 and 100
      settings.commissionPercentage = Math.min(100, Math.max(0, commissionPercentage));
    }

    await settings.save();

    return jsonResponse(settings);
  } catch (error) {
    console.error('Settings POST error:', error);
    return jsonResponse({ error: 'Failed to update settings' }, 500);
  }
}

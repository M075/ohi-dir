// app/api/users/[userId]/geocode/route.js - FIXED VERSION
import connectDB from '@/config/database';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/authOptions';
import { geocodeAddress, validateSAAddress } from '@/utils/geocoding';

export async function POST(request, { params }) {
  try {
    await connectDB();
    
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await params;

    // Verify user owns this profile
    if (session.user.id !== userId) {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get user from database
    const user = await User.findById(userId);
    
    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate address
    const validation = validateSAAddress({
      city: user.city,
      province: user.province,
      zipCode: user.zipCode
    });

    if (!validation.valid) {
      return Response.json(
        { 
          error: 'Invalid address', 
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Geocode the address
    const addressString = {
      address: user.address,
      city: user.city,
      province: user.province,
      zipCode: user.zipCode,
      country: user.country || 'South Africa'
    };

    console.log('Geocoding address:', addressString);

    const geocodeResult = await geocodeAddress(addressString, {
      preferredProvider: 'nominatim'
    });

    // Update user with coordinates
    user.latitude = geocodeResult.latitude;
    user.longitude = geocodeResult.longitude;
    user.geocodedAddress = geocodeResult.displayName;
    user.geocodedAt = new Date();

    await user.save();

    return Response.json({
      success: true,
      latitude: user.latitude,
      longitude: user.longitude,
      geocodedAddress: user.geocodedAddress,
      provider: geocodeResult.provider
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return Response.json(
      { error: error.message || 'Failed to geocode address' },
      { status: 500 }
    );
  }
}

// PUT - Auto-geocode when address is updated
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    if (session.user.id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const user = await User.findById(userId);
    
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update all profile fields
    const profileFields = ['phone', 'storename', 'about'];
    profileFields.forEach(field => {
      if (body[field] !== undefined) {
        user[field] = body[field];
      }
    });

    // Update address fields
    const addressFields = ['address', 'city', 'province', 'zipCode', 'country'];
    let addressChanged = false;

    addressFields.forEach(field => {
      if (body[field] !== undefined && body[field] !== user[field]) {
        user[field] = body[field];
        addressChanged = true;
      }
    });

    // ONLY auto-geocode if address changed AND all required fields are present
    const hasCompleteAddress = user.address && user.city && user.province;
    
    if (addressChanged && hasCompleteAddress) {
      try {
        const addressString = {
          address: user.address,
          city: user.city,
          province: user.province,
          zipCode: user.zipCode,
          country: user.country || 'South Africa'
        };

        const geocodeResult = await geocodeAddress(addressString);
        
        user.latitude = geocodeResult.latitude;
        user.longitude = geocodeResult.longitude;
        user.geocodedAddress = geocodeResult.displayName;
        user.geocodedAt = new Date();
        
        console.log('Auto-geocoded address:', geocodeResult);
      } catch (geocodeError) {
        console.error('Auto-geocode failed:', geocodeError);
        // Don't fail the update if geocoding fails
        // User can manually trigger geocoding later
      }
    } else if (addressChanged && !hasCompleteAddress) {
      console.log('Address incomplete, skipping geocoding');
    }

    await user.save();

    return Response.json({
      success: true,
      user: {
        ...user.toObject(),
        geocoded: !!(user.latitude && user.longitude)
      }
    });

  } catch (error) {
    console.error('Update error:', error);
    return Response.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
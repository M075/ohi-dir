// app/api/auth/signup/route.js - FIXED VERSION
import connectDB from '@/config/database';
import User from '@/models/User';

export async function POST(request) {
  try {
    await connectDB();
    
    const { email, password, storename } = await request.json();

    // Validation
    if (!email || !password || !storename) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate storename length
    if (storename.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Store name must be at least 3 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          error: 'An account with this email already exists. Please sign in instead.' 
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create user WITHOUT geocoding (user has no address yet)
    // Geocoding will happen during onboarding when address is provided
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password, // Will be hashed by model's pre-save hook
      storename: storename.trim(),
      authProvider: 'credentials',
      isOnboarded: false, // User needs to complete onboarding
      isEmailVerified: false,
      // Don't set any address/location fields yet
    });

    console.log('User created successfully (no geocoding):', user._id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully',
        userId: user._id.toString(),
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return new Response(
        JSON.stringify({ error: messages.join(', ') }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle duplicate key errors (shouldn't happen due to check above, but just in case)
    if (error.code === 11000) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Failed to create account. Please try again.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
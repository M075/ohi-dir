// app/api/auth/register/route.js - Updated with role support
import connectDB from '@/config/database';
import User from '@/models/User';

export async function POST(request) {
  try {
    await connectDB();

    const { email, password, storename, role } = await request.json();

    // Validation
    if (!email || !password || !storename) {
      return new Response(
        JSON.stringify({ error: 'Please provide all required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['buyer', 'seller'];
    const userRole = validRoles.includes(role) ? role : 'buyer';

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create user - DO NOT hash password here, let the Mongoose model handle it
    // The model's pre-save hook will hash the password automatically
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: password, // Pass unhashed password, model will hash it
      storename: storename.trim(),
      authProvider: 'credentials',
      role: userRole,
      isOnboarded: userRole === 'buyer', // Buyers are onboarded immediately, sellers need onboarding
      isVerifiedSeller: false, // Sellers need verification
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully',
        user: {
          id: user._id,
          email: user.email,
          storename: user.storename,
          role: user.role,
          isOnboarded: user.isOnboarded,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create account. Please try again.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
import connectDB from '@/config/database';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';
import { uploadToImageKit } from '@/utils/imagekit';

export const POST = async (request, { params }) => {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { userId } = await params;

    // Ensure user can only update their own profile
    if (session.user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image');
    const imageType = formData.get('type'); // 'avatar' or 'cover'

    if (!imageFile || imageFile.size === 0) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['avatar', 'cover'].includes(imageType)) {
      return new Response(JSON.stringify({ error: 'Invalid image type' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Upload to ImageKit
    const fileName = `${imageType}_${userId}_${Date.now()}_${imageFile.name}`;
    const uploadResult = await uploadToImageKit(imageFile, fileName, {
      folder: `/users/${userId}/${imageType}`,
      tags: ['user', imageType],
    });

    // Determine which field to update based on image type
    const updateField = imageType === 'avatar' ? 'image' : 'coverImage';

    // Update user in database
    const user = await User.findByIdAndUpdate(
      userId,
      { [updateField]: uploadResult.url },
      { new: true }
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      url: uploadResult.url,
      type: imageType,
      user 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to upload image' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

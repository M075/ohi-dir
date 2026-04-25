import connectDB from '@/config/database';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';
import { google } from 'googleapis';
import { Readable } from 'stream';

// GET /api/products
export const GET = async (request) => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connection established.');

    console.log('Fetching products...');
    const products = await Product.find();
    console.log(`Fetched ${products.length} products.`);

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Initialize Google Drive client
const initGoogleDrive = () => {
  const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  return google.drive({ version: 'v3', auth });
};

// Function to upload file to Google Drive
const uploadToGoogleDrive = async (file) => {
  try {
    const drive = initGoogleDrive();
    
    // Convert file data to buffer
    const buffer = Buffer.from(await file.text(), 'base64');
    
    // Create readable stream from buffer
    const stream = Readable.from(buffer);
    
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
    const filename = `${timestamp}-${originalName}`;

    console.log(`Starting upload for ${filename} (${buffer.length} bytes)`);

    // Upload file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType: file.type,
        // parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
    });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the file's web view link
    const fileData = await drive.files.get({
      fileId: response.data.id,
      fields: 'webViewLink, webContentLink',
    });

    // Return the direct download link
    const fileUrl = fileData.data.webContentLink;
    console.log(`Successfully uploaded ${filename}: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

export const POST = async (request) => {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID is required', { status: 401 });
    }

    const { userId } = sessionUser;
    const formData = await request.formData();

    // Get all image files
    const imageFiles = formData.getAll('images').filter((image) => image.name !== '');
    
    console.log('Files to process:', imageFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    // Upload all images to Google Drive and get their URLs
    const imageUrls = await Promise.all(
      imageFiles.map(async (image) => {
        try {
          const url = await uploadToGoogleDrive(image);
          console.log(`Upload successful for ${image.name}: ${url}`);
          return url;
        } catch (error) {
          console.error(`Failed to upload ${image.name}:`, error);
          throw error;
        }
      })
    );

    const productData = {
      owner: userId,
      title: formData.get('title'),
      description: formData.get('description'),
      price: formData.get('price') || 0,
      stock: formData.get('stock') || 0,
      brand: formData.get('brand'),
      category: formData.get('category'),
      status: formData.get('status'),
      deliveryOptions: JSON.parse(formData.get('deliveryOptions')),
      keywords: formData.get('keywords'),
      featured: formData.get('featured'),
      rating: formData.get('rating') || 0,
      warranty: formData.get('warranty'),
      review: formData.getAll('review').map((review) => JSON.parse(review)),
      discountPercentage: formData.get('discountPercentage') || 0,
      images: imageUrls,
    };

    console.log('Creating product with data:', {
      ...productData,
      images: `${imageUrls.length} images`
    });

    const newProduct = new Product(productData);
    await newProduct.save();

    return Response.redirect(
      `${process.env.NEXTAUTH_URL}/products/${newProduct._id}`
    );

  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
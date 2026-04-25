import connectDB from '@/config/database';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';
import { getSessionUser } from '@/utils/getSessionUser';


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

export const POST = async (request) => {
  try {
await connectDB();

const sessionUser = await getSessionUser();

if (!sessionUser || !sessionUser.userId) {
  return new Response('User ID is required', { status: 401 });
}

const { userId } = sessionUser;

console.log(sessionUser)

    const formData = await request.formData()

    const images = formData.getAll('images').filter((image) => image.name !== '');

    const productData = {
      owner: userId,
      title: formData.get('title'),
      description: formData.get('description'),
      price: formData.get('price'),
      stock: formData.get('stock'),
      brand: formData.get('brand'),
      category: formData.get('category'),
      images,
    }

    // console.log(productData)

    const newProduct = new Product(productData);
await newProduct.save();

return Response.redirect(
  `${process.env.NEXTAUTH_URL}/products/${newProduct._id}`
);
    // return new Response(JSON.stringify(productData), {
    //   status: 200
    // })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
}

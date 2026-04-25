// app/api/cart/route.js
import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch user's cart
export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let cart = await Cart.findOne({ user: sessionUser.userId })
      .populate('items.product', 'title images price stock ownerName deliveryOptions');

    // Create cart if doesn't exist
    if (!cart) {
      cart = await Cart.create({
        user: sessionUser.userId,
        items: [],
      });
    }

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cart GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - Add item to cart
export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { productId, quantity = 1 } = await request.json();

    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (product.stock < quantity) {
      return new Response(
        JSON.stringify({ error: 'Insufficient stock' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: sessionUser.userId });
    if (!cart) {
      cart = new Cart({ user: sessionUser.userId, items: [] });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stock) {
        return new Response(
          JSON.stringify({ error: 'Insufficient stock' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        productSnapshot: {
          title: product.title,
          image: product.images?.[0] || '/image.png',
          ownerName: product.ownerName,
        },
      });
    }

    await cart.save();
    
    // Populate product details
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'title images price stock ownerName deliveryOptions');

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cart POST error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT - Update cart item quantity
export async function PUT(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { itemId, quantity } = await request.json();

    if (quantity < 1) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be at least 1' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let cart = await Cart.findOne({ user: sessionUser.userId });
    if (!cart) {
      return new Response(
        JSON.stringify({ error: 'Cart not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return new Response(
        JSON.stringify({ error: 'Item not found in cart' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check stock
    const product = await Product.findById(item.product);
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (quantity > product.stock) {
      return new Response(
        JSON.stringify({ error: 'Insufficient stock' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    item.quantity = quantity;
    await cart.save();

    // Populate product details
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'title images price stock ownerName deliveryOptions');

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cart PUT error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE - Remove item from cart
export async function DELETE(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    let cart = await Cart.findOne({ user: sessionUser.userId });
    if (!cart) {
      return new Response(
        JSON.stringify({ error: 'Cart not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    // Populate product details
    cart = await Cart.findById(cart._id)
      .populate('items.product', 'title images price stock ownerName deliveryOptions');

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cart DELETE error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// app/api/cart/clear/route.js
// DELETE - Clear entire cart
export async function clearCart(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cart = await Cart.findOneAndUpdate(
      { user: sessionUser.userId },
      { items: [] },
      { new: true }
    );

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cart clear error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
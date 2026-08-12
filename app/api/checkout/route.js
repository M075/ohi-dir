// app/api/checkout/route.js - FIXED VERSION
import connectDB from '@/config/database';
import mongoose from 'mongoose';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import User from '@/models/User';
import Product from '@/models/Product';
import Setting from '@/models/Setting';
import { getSessionUser } from '@/utils/getSessionUser';
import { calculateShipping, estimateDelivery, validateShippingAddress, getAvailableShippingMethods } from '@/utils/shipping';
import { createPayFastPayment } from '@/utils/payfast';
import { CourierServiceManager, getLockerTariff } from '@/utils/courierServices';
import { buildSellerSnapshot, buildParcelsForItem, summarizeParcels } from '@/utils/orderShippingHelpers';
import { quoteCartShipping, resolveSelectedQuote } from '@/utils/checkoutQuotes';
import { maybeExpirePendingOrders } from '@/utils/expirePendingOrders';

// Helper function to send JSON responses
const jsonResponse = (data, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      } 
    }
  );
};

// GET - Get shipping methods for checkout
export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'Johannesburg';
    const province = searchParams.get('province') || 'Gauteng';

    const cart = await Cart.findOne({ user: sessionUser.userId })
      .populate({
        path: 'items.product',
        select: 'deliveryOptions owner ownerName title dimensions weight price',
        populate: {
          path: 'owner',
          select: 'storename email phone address city province zipCode country',
        },
      });

    if (!cart || cart.items.length === 0) {
      return jsonResponse({ error: 'Cart is empty' }, 400);
    }

    const destination = { city, province };
    const courierManager = new CourierServiceManager();
    const courierQuotesBySeller = {};

    const sellerParcelsMap = {};
    for (const item of cart.items) {
      const sellerId = item.product?.owner?._id?.toString?.();
      if (!sellerId) continue;
      if (!sellerParcelsMap[sellerId]) {
        sellerParcelsMap[sellerId] = {
          seller: item.product.owner,
          parcels: [],
          declaredValue: 0,
        };
      }
      sellerParcelsMap[sellerId].parcels.push(...buildParcelsForItem(item));
      sellerParcelsMap[sellerId].declaredValue += item.price * item.quantity;
    }

    await Promise.all(Object.entries(sellerParcelsMap).map(async ([sellerId, data]) => {
      const sellerAddress = buildSellerSnapshot(data.seller);
      const buyerAddress = {
        type: 'residential',
        city,
        province,
        postalCode: '',
        address: '',
      };

      try {
        const quotes = await courierManager.getAllQuotes({
          from: sellerAddress,
          to: buyerAddress,
          parcels: summarizeParcels(data.parcels).parcels,
          declaredValue: data.declaredValue,
        });
        courierQuotesBySeller[sellerId] = quotes;
      } catch (err) {
        console.warn('Failed to fetch courier quotes for seller', sellerId, err.message);
        courierQuotesBySeller[sellerId] = [];
      }
    }));

    const shippingMethods = getAvailableShippingMethods(
      cart.items,
      destination,
      Object.values(courierQuotesBySeller).flat()
    );

    return jsonResponse({ shippingMethods, courierQuotes: courierQuotesBySeller });

  } catch (error) {
    console.error('Checkout GET error:', error);
    return jsonResponse({ 
      error: error.message || 'Failed to fetch shipping methods',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, 500);
  }
}

// POST - Create orders from cart
export async function POST(request) {
  let mongoSession = null;

  try {
    await connectDB();
    
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      console.error('❌ Unauthorized: No user session');
      return jsonResponse({ error: 'Unauthorized - Please sign in' }, 401);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return jsonResponse({ 
        error: 'Invalid request format',
        details: 'Request body must be valid JSON'
      }, 400);
    }

    const {
      shippingAddress,
      shippingMethod,
      paymentMethod,
      customerNotes,
      shippingOption = 'door-to-door',
      lockerSelection,
      shippingQuotes: clientShippingQuotes,
    } = body;

    const fulfillmentOption = shippingOption || 'door-to-door';
    const resolvedShippingMethod = (() => {
      if (fulfillmentOption === 'collection') return 'collection';
      if (fulfillmentOption === 'pudo') return 'pudo';
      return shippingMethod || 'standard';
    })();

    console.log('📦 Checkout initiated:', {
      userId: sessionUser.userId,
      shippingMethod: resolvedShippingMethod,
      fulfillmentOption,
      paymentMethod,
      hasAddress: !!shippingAddress
    });

    // Validate required fields
    if (!shippingAddress) {
      console.error('❌ Missing shipping address');
      return jsonResponse({ 
        error: 'Shipping address is required',
        field: 'shippingAddress'
      }, 400);
    }

    // Normalize address - handle both 'region' and 'province' field names
    const normalizedAddress = {
      fullName: shippingAddress.fullName || '',
      email: shippingAddress.email || '',
      phone: shippingAddress.phone || '',
      company: shippingAddress.company || '',
      address: shippingAddress.address || '',
      apartment: shippingAddress.apartment || '',
      city: shippingAddress.city || '',
      province: shippingAddress.province || shippingAddress.region || '',
      postalCode: shippingAddress.postalCode || shippingAddress.zipCode || '',
    };

    let lockerDetailsPayload = null;

    if (!normalizedAddress.fullName || !normalizedAddress.email) {
      return jsonResponse({
        error: 'Full name and email are required',
        field: 'shippingAddress'
      }, 400);
    }

    if (fulfillmentOption === 'door-to-door') {
      const addressValidation = validateShippingAddress(normalizedAddress);
      if (!addressValidation.valid) {
        console.error('❌ Invalid address:', addressValidation.errors);
        return jsonResponse({ 
          error: 'Invalid shipping address', 
          details: addressValidation.errors,
          field: 'shippingAddress'
        }, 400);
      }
    } else if (fulfillmentOption === 'pudo') {
      if (!lockerSelection) {
        return jsonResponse({
          error: 'Locker selection is required for PUDO deliveries',
          field: 'lockerSelection'
        }, 400);
      }
      normalizedAddress.address = lockerSelection.address || normalizedAddress.address || 'PUDO Locker';
      normalizedAddress.apartment = lockerSelection.name || lockerSelection.lockerName || normalizedAddress.apartment;
      normalizedAddress.city = lockerSelection.city || normalizedAddress.city || '';
      normalizedAddress.province = lockerSelection.province || normalizedAddress.province || '';
      normalizedAddress.postalCode = lockerSelection.postalCode || normalizedAddress.postalCode || '0000';

      // The buyer chooses a locker and a size; the price and service code come
      // from our own tariff table, never from the request body.
      const lockerTariff = getLockerTariff(lockerSelection.lockerSize);

      lockerDetailsPayload = {
        provider: 'pudo',
        lockerId: lockerSelection.id || lockerSelection.lockerId || lockerSelection.lockerID,
        lockerName: lockerSelection.name || lockerSelection.lockerName || 'PUDO Locker',
        lockerAddress: lockerSelection.address || normalizedAddress.address,
        distanceKm: lockerSelection.distanceKm ?? lockerSelection.distance ?? null,
        status: lockerSelection.status || 'pending',
        pickupPointId: lockerSelection.pickupPointId || lockerSelection.id || lockerSelection.lockerId || lockerSelection.lockerID,
        pickupPointProvider: lockerSelection.pickupPointProvider || 'tcg-locker',
        lockerSize: lockerTariff.size,
        serviceCode: lockerTariff.service_level_code,
        price: lockerTariff.price,
      };
    } else if (fulfillmentOption === 'collection') {
      normalizedAddress.address = normalizedAddress.address || 'Collection - buyer to arrange pickup';
      normalizedAddress.city = normalizedAddress.city || 'Collection';
      normalizedAddress.province = normalizedAddress.province || 'Collection';
      normalizedAddress.postalCode = normalizedAddress.postalCode || '0000';
    }

    console.log('📍 Normalized address:', normalizedAddress);

    // Get buyer details
    const buyer = await User.findById(sessionUser.userId);
    if (!buyer) {
      console.error('❌ Buyer not found:', sessionUser.userId);
      return jsonResponse({ error: 'User not found' }, 404);
    }

    console.log('👤 Buyer:', buyer.email);

    // Release stock still held by abandoned checkouts before validating this
    // cart, so a buyer is never told an item is out of stock because someone
    // else walked away from the PayFast page half an hour ago. Throttled, so
    // this is usually a single no-op query.
    await maybeExpirePendingOrders();

    // Get cart with populated products
    const cart = await Cart.findOne({ user: sessionUser.userId })
      .populate({
        path: 'items.product',
        select: 'title images price stock ownerName owner deliveryOptions dimensions weight',
        populate: {
          path: 'owner',
          select: 'storename email phone address city province zipCode country',
        },
      });

    if (!cart || cart.items.length === 0) {
      console.error('❌ Cart is empty');
      return jsonResponse({ 
        error: 'Cart is empty',
        message: 'Please add items to your cart before checking out'
      }, 400);
    }

    console.log(`🛒 Cart items: ${cart.items.length}`);

    // Verify all products exist and have stock
    const validationErrors = [];
    
    console.log('🔍 Validating cart items...');
    for (const item of cart.items) {
      console.log('Checking item:', {
        itemId: item._id,
        hasProduct: !!item.product,
        productId: item.product?._id,
        productTitle: item.product?.title,
        hasOwner: !!item.product?.owner,
        ownerId: item.product?.owner?._id || item.product?.owner,
        stock: item.product?.stock,
        quantity: item.quantity
      });

      if (!item.product) {
        validationErrors.push({
          item: item._id,
          error: 'Product no longer exists'
        });
        continue;
      }
      
      if (!item.product.owner) {
        validationErrors.push({
          item: item._id,
          product: item.product.title,
          error: 'Product has no owner',
          productId: item.product._id
        });
        continue;
      }
      
      if (item.product.stock < item.quantity) {
        validationErrors.push({
          item: item._id,
          product: item.product.title,
          error: `Insufficient stock (Available: ${item.product.stock}, Requested: ${item.quantity})`
        });
      }
    }

    if (validationErrors.length > 0) {
      console.error('❌ Cart validation failed:', validationErrors);
      return jsonResponse({ 
        error: 'Cart validation failed',
        details: validationErrors,
        message: `Found ${validationErrors.length} issue(s) with cart items. Please review your cart.`
      }, 400);
    }

    // Group items by seller
    const ordersBySeller = {};
    
    for (const item of cart.items) {
      const sellerId = item.product.owner._id.toString();
      const sellerName = item.product.owner.storename || item.product.ownerName || 'Unknown Seller';
      const sellerSnapshot = buildSellerSnapshot(item.product.owner);
      
      if (!ordersBySeller[sellerId]) {
        ordersBySeller[sellerId] = {
          seller: sellerId,
          sellerName: sellerName,
          items: [],
          subtotal: 0,
          sellerAddress: sellerSnapshot,
          parcels: [],
        };
      }
      
      ordersBySeller[sellerId].items.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        productSnapshot: {
          title: item.product.title,
          image: item.product.images?.[0] || '/image.png',
          ownerName: sellerName,
        },
      });
      
      ordersBySeller[sellerId].subtotal += item.price * item.quantity;
      ordersBySeller[sellerId].parcels.push(...buildParcelsForItem(item));
    }

    console.log(`📊 Orders grouped by ${Object.keys(ordersBySeller).length} seller(s)`);

    if (Object.keys(ordersBySeller).length > 1) {
      return jsonResponse({
        error: 'Multi-seller checkout is not supported',
        message: 'You have items from multiple sellers in your cart. Checkout is currently limited to one seller at a time. Please make separate orders.'
      }, 400);
    }

    // Fetch tax setting
    const settings = await Setting.findOne();
    const taxEnabled = settings ? settings.taxEnabled : true;

    // Re-quote shipping on the server. The browser tells us which courier
    // service the buyer picked, but never what it costs — that is looked up
    // from live quotes below. Trusting a client-supplied price meant a buyer
    // could post `price: 0` and still have us book (and pay for) a real
    // collection.
    let serverQuotes = { quotesBySeller: {} };
    if (fulfillmentOption === 'door-to-door') {
      serverQuotes = await quoteCartShipping(cart, normalizedAddress);
    }

    // Create separate orders for each seller using a transaction
    mongoSession = await mongoose.startSession();
    const createdOrders = [];
    
    try {
      await mongoSession.withTransaction(async () => {
        for (const [sellerId, orderData] of Object.entries(ordersBySeller)) {
          console.log(`📝 Creating order for seller: ${orderData.sellerName}`);
          
          let selectedCourierQuote = null;

          // Shipping is priced entirely server-side. The client's selection is
          // used only to pick *which* service, and is matched against the
          // quotes we fetched ourselves above.
          const shippingCost = (() => {
            if (fulfillmentOption === 'collection') {
              return 0; // Buyer collects from the seller — no courier involved.
            }

            if (fulfillmentOption === 'pudo') {
              return lockerDetailsPayload?.price ?? getLockerTariff().price;
            }

            const sellerQuotes = serverQuotes.quotesBySeller?.[sellerId];
            const clientSelection = clientShippingQuotes?.bestBySeller?.[sellerId];
            const quote = resolveSelectedQuote(sellerQuotes, clientSelection);

            if (quote && typeof quote.price === 'number') {
              selectedCourierQuote = quote;
              return quote.price;
            }

            // Couriers didn't quote (API down, unserviceable address). Fall
            // back to our own table rather than shipping for free.
            console.warn(`No live courier quote for seller ${sellerId}; using fallback rate.`);
            return calculateShipping(
              orderData.items.map(item => ({
                ...item,
                weight: 0.5, // Default weight
              })),
              normalizedAddress,
              resolvedShippingMethod
            );
          })();

          const tax = taxEnabled ? orderData.subtotal * 0.15 : 0; // 15% VAT conditionally
          const total = orderData.subtotal + shippingCost + tax;

          console.log(`💰 Order total: R${total.toFixed(2)} (subtotal: R${orderData.subtotal.toFixed(2)}, shipping: R${shippingCost.toFixed(2)}, tax: R${tax.toFixed(2)})`);

          // Create order with ALL required fields
          const orderDoc = {
            // REQUIRED: Buyer information
            buyer: sessionUser.userId,
            buyerEmail: normalizedAddress.email || buyer.email,
            
            // REQUIRED: Seller information
            seller: sellerId,
            sellerName: orderData.sellerName,
            
            // Items
            items: orderData.items,
            
            // Pricing (REQUIRED)
            subtotal: orderData.subtotal,
            shipping: shippingCost,
            tax: tax,
            total: total,
            
            // Shipping address (REQUIRED)
            shippingAddress: {
              fullName: normalizedAddress.fullName || normalizedAddress.company || buyer.storename || 'Customer',
              email: normalizedAddress.email || buyer.email,
              phone: normalizedAddress.phone || '',
              address: normalizedAddress.address,
              apartment: normalizedAddress.apartment || '',
              city: normalizedAddress.city,
              province: normalizedAddress.province,
              zipCode: normalizedAddress.postalCode,
              country: 'South Africa',
            },
            sellerAddressSnapshot: orderData.sellerAddress,
            parcelSummary: summarizeParcels(orderData.parcels),
            courierQuote: selectedCourierQuote ? { ...selectedCourierQuote } : undefined,
            
            // Shipping method
            shippingMethod: resolvedShippingMethod,
            fulfillmentOption,
            estimatedDelivery: estimateDelivery(
              resolvedShippingMethod, 
              'Johannesburg', 
              normalizedAddress.city
            ),
            lockerDetails: lockerDetailsPayload ? { ...lockerDetailsPayload } : undefined,
            
            // Payment (REQUIRED)
            paymentMethod: paymentMethod || 'payfast',
            paymentStatus: 'pending',
            
            // Notes
            customerNotes: customerNotes || '',
            
            // Status
            status: 'pending',
            
            // Status history
            statusHistory: [{
              status: 'pending',
              timestamp: new Date(),
              note: 'Order created',
            }],
          };

          // Let the model generate orderNumber via pre-save hook
          const order = new Order(orderDoc);
          await order.save({ session: mongoSession });

          console.log(`✅ Order created: ${order.orderNumber}`);
          
          createdOrders.push(order);
          
          // Reduce stock for each item
          for (const item of orderData.items) {
            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: -item.quantity } },
              { session: mongoSession }
            );
          }
        }

        // NOTE: the cart is intentionally NOT cleared here. Orders are created
        // as paymentStatus 'pending' and the buyer is redirected to PayFast to
        // pay. The cart is only cleared once payment is confirmed 'paid' (in the
        // PayFast ITN handler / return-URL verify), so an abandoned or failed
        // payment leaves the cart intact for the buyer to retry.
      });

      await mongoSession.endSession();
      mongoSession = null;
      
    } catch (txError) {
      if (mongoSession) {
        await mongoSession.endSession();
      }
      console.error('❌ Transaction failed:', txError);
      throw new Error(`Transaction failed: ${txError.message}`);
    }

    // Handle PayFast payment
    let paymentData = null;
    
    if (paymentMethod === 'payfast' && createdOrders.length > 0) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`;
        
        // Create PayFast data for all orders combined
        const payfastResult = createPayFastPayment(
          createdOrders,
          `${baseUrl}/payment/success`,
          `${baseUrl}/checkout`,
          `${baseUrl}/api/payment/payfast/notify`
        );

        paymentData = {
          formData: payfastResult.data,
          formAction: payfastResult.url
        };
        
        console.log('💳 PayFast payment data generated:', {
          action: payfastResult.url,
          merchant_id: payfastResult.data.merchant_id,
          amount: payfastResult.data.amount
        });
      } catch (pfError) {
        console.error('⚠️ PayFast error (continuing anyway):', pfError);
        // Don't fail the whole order if PayFast fails
      }
    }

    console.log('🎉 Checkout complete!');

    return jsonResponse({ 
      success: true,
      orders: createdOrders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        total: o.total,
        seller: o.seller,
        sellerName: o.sellerName,
      })),
      message: `${createdOrders.length} order(s) created successfully`,
      payment: paymentData, // Return PayFast form data with formData and formAction
    }, 201);

  } catch (error) {
    // Cleanup session if it exists
    if (mongoSession) {
      try {
        await mongoSession.endSession();
      } catch (e) {
        console.error('Failed to end session:', e);
      }
    }

    console.error('❌ Checkout error:', error);
    console.error('Stack trace:', error.stack);
    
    return jsonResponse({ 
      error: error.message || 'Failed to process checkout',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    }, 500);
  }
}
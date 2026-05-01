# Shipment Integration Implementation Guide

## Overview

Shipments are now automatically created on **Shiplogic (dev) / Courier Guy (production)** when orders are successfully paid through PayFast.

## Implementation Details

### Files Modified

1. **`/app/api/payment/verify/route.js`**
   - Added import: `createShiplogicShipmentFromOrder`
   - Creates shipments after payment verification via return URL
   - Updates order with Shiplogic shipment details

2. **`/app/api/payment/payfast/notify/route.js`**
   - Added import: `createShiplogicShipmentFromOrder`
   - Creates shipments in PayFast ITN webhook handler
   - Ensures shipments are created regardless of user navigation path

### Payment Flow & Shipment Creation

```
1. User clicks Checkout
   ↓
2. Orders created (status: pending, paymentStatus: pending)
   ↓
3. User completes PayFast payment
   ↓
4. Two paths to confirmation:
   
   Path A: User returns to /payment/success
   └─→ POST /api/payment/verify called
       └─→ Orders marked as "paid" → "processing"
           └─→ Shipments created on Shiplogic
               └─→ Orders marked as "shipped" with tracking
   
   Path B: PayFast sends ITN webhook
   └─→ POST /api/payment/payfast/notify called
       └─→ Orders marked as "paid" → "processing"
           └─→ Shipments created on Shiplogic
               └─→ Orders marked as "shipped" with tracking
```

### Shipment Creation Logic

**Conditions for automatic shipment creation:**
- ✅ Order `paymentStatus === 'paid'`
- ✅ Order `fulfillmentOption === 'door-to-door'`
- ✅ Order does NOT already have `courierReference` (idempotent)
- ❌ Skips for `fulfillmentOption === 'collection'` (buyer arranges pickup)
- ❌ Skips for `fulfillmentOption === 'pudo'` (locker delivery handled separately)

**Order Updates After Shipment Creation:**
```javascript
{
  courierProvider: 'courier-guy',
  courierReference: '<shipment_id>',           // Shiplogic shipment ID
  trackingNumber: '<tracking_reference>',      // Tracking reference
  status: 'shipped',                           // Changed from 'processing'
  shippedAt: new Date(),                       // Timestamp
  statusHistory: [..., {
    status: 'shipped',
    timestamp: new Date(),
    note: 'Shipment created on Shiplogic - Reference: <shipment_id>'
  }]
}
```

### Error Handling

- **Graceful degradation:** If shipment creation fails, payment verification still succeeds
- **Order remains in processing state** if shipment creation fails
- **Logs errors** for manual intervention or automatic retry
- **Does NOT block** payment confirmation or order completion

## Configuration

### Required Environment Variables

All variables are already configured in your `.env` file:

```env
SHIPLOGIC_API_KEY="f038bde60de54b6b974b0fc0ecc87ce1"
SHIPLOGIC_API_URL="https://api.shiplogic.com"
SHIPLOGIC_ACCOUNT_ID=(optional - for special rate codes)
```

### Testing Shipment Creation

#### 1. Development Testing

**Use Shiplogic Sandbox:**
```javascript
// Verify order has parcel data
order.parcelSummary.parcels = [
  {
    description: 'Product Name',
    weightKg: 1,
    lengthCm: 20,
    widthCm: 20,
    heightCm: 10
  }
]

// Verify address data exists
order.shippingAddress = { ... }
order.sellerAddressSnapshot = { ... }
```

**Monitor logs:**
```
📦 Creating shipment on Shiplogic for order: ORD-20260426-1234
✅ Shipment created successfully for ORD-20260426-1234: {
  shipmentId: "SHP123456",
  trackingNumber: "TCG123456789",
  labelUrl: "https://shiplogic.com/label/..."
}
```

#### 2. Test Checklist

- [ ] **Single Door-to-Door Order**
  - Create order with door-to-door shipping
  - Complete payment
  - Verify shipment appears on Shiplogic dev dashboard
  - Verify order status is "shipped" with tracking number

- [ ] **Multiple Orders (Same Cart)**
  - Add items from 2+ sellers to cart
  - Create multiple orders in checkout
  - Complete payment for all orders
  - Verify each seller's shipment on dashboard

- [ ] **Collection Fulfillment**
  - Create order with collection option
  - Complete payment
  - Verify order is "processing" NOT "shipped"
  - Verify NO shipment created on Shiplogic

- [ ] **PUDO Fulfillment**
  - Create order with PUDO locker option
  - Complete payment
  - Verify order is "processing" NOT "shipped"
  - Verify NO shipment created on Shiplogic

- [ ] **Error Handling**
  - Simulate API failure (disconnect internet)
  - Verify payment still processes successfully
  - Verify order marked as paid/processing
  - Verify error logged for manual retry

- [ ] **Idempotency**
  - Test duplicate webhook calls
  - Verify shipment only created once
  - Verify order not duplicated

#### 3. Production Verification

When deploying to production:

1. **Verify environment variables** use Courier Guy (production) credentials
2. **Monitor shipment creation logs** in first few transactions
3. **Check Courier Guy dashboard** for shipments appearing correctly
4. **Verify tracking numbers** are properly stored in database
5. **Test seller workflow** - sellers should see shipments in their dashboard

## Database Fields

The Order model stores shipment information:

```javascript
{
  // Courier identification
  courierProvider: 'courier-guy' | 'shiplogic' | 'fastway' | 'pudo' | null,
  courierReference: String,        // Shipment ID from provider
  
  // Tracking
  trackingNumber: String,          // Tracking reference number
  trackingUrl: String,             // URL to track shipment (if provided)
  
  // Fulfillment
  fulfillmentOption: 'door-to-door' | 'pudo' | 'collection',
  
  // Status tracking
  status: 'shipped' | 'processing' | ...,
  shippedAt: Date,                 // When shipment was created
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String                   // References shipment ID
  }]
}
```

## Related Endpoints

These endpoints also create shipments (existing functionality):

- `PATCH /api/orders/[id]/status` - Manual status update to "processing"
- Follows same logic: only for door-to-door, idempotent, graceful error handling

## Troubleshooting

### Shipment Not Created

**Check logs for error:**
```
⚠️ Failed to create shipment for order ORD-20260426-1234: [error message]
```

**Common causes:**
1. Missing `SHIPLOGIC_API_KEY` or invalid credentials
2. Incomplete parcel data (`parcelSummary.parcels` empty)
3. Missing or incomplete shipping address
4. Missing seller address snapshot
5. API rate limiting from Shiplogic
6. Network connectivity issue

**Resolution:**
- Verify order has all required fields populated
- Check API credentials in `.env`
- Retry manually via admin panel (if available)
- Contact Shiplogic support if API errors persist

### Shipment Created But Not Appearing on Dashboard

**Possible causes:**
1. Shipment created in sandbox but dashboard is pointing to production (or vice versa)
2. API key is for different account
3. Shipment was created but with different seller ID

**Resolution:**
- Verify `SHIPLOGIC_API_URL` matches your environment
- Verify `SHIPLOGIC_API_KEY` is for correct account
- Check order's `sellerAddressSnapshot` matches Shiplogic account details

### Order Stuck in "processing" Status

If order remains in "processing" and shipment creation failed:

**Manual creation:**
1. Fix underlying issue (address data, API key, etc.)
2. Trigger via manual status update if admin interface supports it
3. Or wait for automatic retry if background job is configured

## Monitoring & Analytics

### Key Metrics to Track

1. **Shipment creation success rate**
   ```javascript
   // Monitor in logs:
   - Total payment confirmations
   - Successful shipment creations
   - Failed shipment creations
   ```

2. **Response times**
   - Shipment creation should complete within 5 seconds
   - If slower, may indicate Shiplogic API performance issues

3. **Error patterns**
   - Group errors by type
   - Alert on repeated failures for same seller

### Suggested Monitoring

Add to your logging/monitoring service:
```javascript
// Success
"Shipment created",
{ 
  orderId: order._id, 
  shipmentId: result.shipmentId,
  duration_ms: Date.now() - startTime 
}

// Error
"Shipment creation failed",
{ 
  orderId: order._id, 
  error: error.message,
  duration_ms: Date.now() - startTime 
}
```

## Future Enhancements

1. **Background job for failed shipments**
   - Retry failed shipment creations on schedule
   - Exponential backoff strategy

2. **Webhook from Shiplogic**
   - Update order when shipment picks up
   - Update order when shipment delivered
   - Sync tracking status to seller dashboard

3. **Seller dashboard integration**
   - Show shipment status and tracking
   - Allow sellers to reprint labels
   - Show shipment history

4. **Label printing**
   - Auto-generate/store label PDFs
   - Provide download link to seller

5. **Multi-carrier support**
   - Support Fastway, PUDO as shipment providers
   - Implement carrier selection logic
   - Different handling per carrier

## Support & Resources

- **Shiplogic API Docs:** https://api.shiplogic.com
- **Courier Guy Support:** https://www.courierguy.co.za
- **Implementation Status:** ✅ Complete - Ready for testing

---

**Last Updated:** April 26, 2026  
**Status:** Implementation Complete

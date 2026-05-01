# Shipment Creation Debugging Guide

## Error: "Shiplogic parse error: SyntaxError: Unexpected token"

This error occurs when the Shiplogic API returns a non-JSON response. Common causes:

### 1. **API Authentication Error (401/403)**

**Symptoms:**
```
❌ Shiplogic Authentication Failed (401/403)
Check API key configuration.
```

**Solutions:**
- Verify `SHIPLOGIC_API_KEY` is set in `.env`:
  ```bash
  echo $SHIPLOGIC_API_KEY
  ```
- Ensure the API key is valid and not expired
- For production, verify you're using production credentials
- Restart the development server after updating `.env`

**Test the API key directly:**
```bash
curl -X GET "https://api.shiplogic.com/rates" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### 2. **Malformed Request (400 Bad Request)**

**Symptoms:**
```
📨 Shiplogic response: 400 Bad Request
```

**Debug Steps:**

Check the logs for missing fields in the shipment payload:
```
❌ Missing required fields for Shiplogic shipment: ...
```

**Common missing fields:**
- `collectionAddress.street_address` - Seller's street address
- `collectionAddress.city` - Seller's city
- `collectionAddress.zone` (province) - Seller's province
- `deliveryAddress.street_address` - Customer's street address
- `deliveryAddress.city` - Customer's city
- `deliveryAddress.zone` (province) - Customer's province
- `deliveryAddress.name` - Customer's full name
- `parcels` - At least one parcel must be defined

**Fix:** Ensure all order data is populated before checkout:
```javascript
// In Order model or checkout endpoint
order.sellerAddressSnapshot = {
  address: 'seller street address',
  city: 'seller city',
  province: 'seller province',  // Must be present
  ...
};

order.shippingAddress = {
  address: 'buyer street address',
  city: 'buyer city',
  province: 'buyer province',     // Must be present
  fullName: 'buyer full name',
  ...
};

order.parcelSummary = {
  parcels: [
    {
      description: 'Product name',
      weightKg: 1,
      lengthCm: 20,
      widthCm: 20,
      heightCm: 10
    }
  ]
};
```

### 3. **Server Error (500 Internal Server Error)**

**Symptoms:**
```
📨 Shiplogic response: 500 Internal Server Error
⚠️ Shiplogic returned HTML error page
```

**Possible Causes:**
- Invalid data format (e.g., non-numeric values in measurements)
- Service level code doesn't exist or isn't available
- Rate limiting from Shiplogic

**Debug:** Check the payload being sent:
```
📤 Sending shipment to Shiplogic with payload:
  serviceLevel: 'ECO'
  collection: { address: '123 Main St, Cape Town', contact: 'John Doe' }
  delivery: { address: '456 High St, Johannesburg', contact: 'Jane Smith' }
  parcels: 1
  declaredValue: 500
  payloadSize: 1250
```

**Solutions:**
- Verify parcel dimensions and weight are numbers, not strings
- Ensure service level code exists (e.g., 'ECO', 'EXPRESS')
- Contact Shiplogic support if errors persist
- Implement exponential backoff retry for 500 errors

### 4. **Network Issues (Timeout, Connection Refused)**

**Symptoms:**
```
Failed to create shipment: fetch failed / ECONNREFUSED
```

**Solutions:**
- Check internet connection
- Verify `SHIPLOGIC_API_URL` is reachable:
  ```bash
  curl https://api.shiplogic.com
  ```
- Check firewall/proxy settings
- Verify DNS resolution:
  ```bash
  nslookup api.shiplogic.com
  ```

## Detailed Debug Logging

The improved error handling provides detailed logs. Look for:

### Successful Shipment Creation

```
🔗 Shiplogic POST /shipments
📋 Shipment payload for ORD-20260426-5485:
  collection: { address: '123 Main St, Cape Town', contact: 'John Doe' }
  delivery: { address: '456 High St, Johannesburg', contact: 'Jane Smith' }
  parcels: 1
  declared_value: 500
  service_level_code: 'ECO'
📤 Sending shipment to Shiplogic with payload:
  orderNumber: 'ORD-20260426-5485'
  serviceLevel: 'ECO'
  collection: { address: '123 Main St, Cape Town', contact: 'John Doe' }
  delivery: { address: '456 High St, Johannesburg', contact: 'Jane Smith' }
  parcels: 1
  declaredValue: 500
  payloadSize: 1250
📨 Shiplogic response: 201 Created
  contentType: 'application/json'
  isJson: true
  responseLength: 450
✅ Shipment created successfully for ORD-20260426-5485
```

### Failed Shipment Creation

```
🔗 Shiplogic POST /shipments
❌ Missing required fields for Shiplogic shipment: collectionAddress.zone
  orderNumber: 'ORD-20260426-5485'
⚠️ Failed to create shipment for order ORD-20260426-5485: Missing required fields...
```

## Step-by-Step Debugging

1. **Check API Configuration**
   ```bash
   # In your shell/terminal
   echo "API Key set: $([ -z $SHIPLOGIC_API_KEY ] && echo 'NO' || echo 'YES')"
   echo "API URL: $SHIPLOGIC_API_URL"
   ```

2. **Enable Verbose Logging**
   - Check server logs for all `📋`, `📤`, `📨` messages
   - These indicate payload, sending, and response stages

3. **Test with Valid Order Data**
   - Create an order manually
   - Verify all required fields exist in database
   - Check `order.sellerAddressSnapshot` and `order.shippingAddress`

4. **Verify Shiplogic API Status**
   - Check Shiplogic status page
   - Test API directly with curl (see examples above)
   - Contact Shiplogic support

5. **Check Order Data Completeness**
   ```javascript
   // MongoDB query to check order
   db.orders.findOne({ orderNumber: 'ORD-20260426-5485' }).then(order => {
     console.log('Seller Address:', order.sellerAddressSnapshot);
     console.log('Shipping Address:', order.shippingAddress);
     console.log('Parcels:', order.parcelSummary.parcels);
     console.log('Courier Quote:', order.courierQuote);
   });
   ```

## Common Fixes

### Issue: Missing `province` field
```javascript
// ❌ Wrong
sellerAddressSnapshot: {
  address: '123 Main St',
  city: 'Cape Town',
  // Missing: province
}

// ✅ Correct
sellerAddressSnapshot: {
  address: '123 Main St',
  city: 'Cape Town',
  province: 'Western Cape',  // ADD THIS
}
```

### Issue: Empty parcels array
```javascript
// ❌ Wrong
parcelSummary: {
  parcels: []  // Empty!
}

// ✅ Correct
parcelSummary: {
  parcels: [{
    description: 'Product Name',
    weightKg: 1,
    lengthCm: 20,
    widthCm: 20,
    heightCm: 10
  }]
}
```

### Issue: Numeric values as strings
```javascript
// ❌ Wrong
parcel: {
  weightKg: "1",        // String
  lengthCm: "20",       // String
}

// ✅ Correct
parcel: {
  weightKg: 1,          // Number
  lengthCm: 20,         // Number
}
```

## Testing Shipment Creation Manually

If you have a test order, you can manually trigger shipment creation:

```javascript
// In Node.js console or via API endpoint
const { createShiplogicShipmentFromOrder } = require('./utils/courierServices');
const Order = require('./models/Order');

const order = await Order.findOne({ orderNumber: 'ORD-20260426-5485' })
  .populate('buyer seller');

// Add detailed logging
console.log('Order data check:', {
  hasSellerAddress: !!order.sellerAddressSnapshot?.address,
  hasDeliveryAddress: !!order.shippingAddress?.address,
  hasParcels: order.parcelSummary?.parcels?.length > 0,
  sellerProvince: order.sellerAddressSnapshot?.province,
  buyerProvince: order.shippingAddress?.province,
});

// Try shipment creation
try {
  const result = await createShiplogicShipmentFromOrder(order);
  console.log('✅ Shipment created:', result);
} catch (error) {
  console.error('❌ Shipment creation failed:', error);
}
```

## Contact & Resources

- **Shiplogic Documentation:** https://api.shiplogic.com
- **Courier Guy Support:** https://www.courierguy.co.za/contact
- **API Status:** https://api.shiplogic.com/status (if available)

---

**Last Updated:** April 26, 2026

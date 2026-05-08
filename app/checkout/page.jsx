"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSession } from 'next-auth/react';
import { useCart } from '@/assets/contexts/CartContext';
import { toast } from '@/components/hooks/use-toast';
import { Store, Package, CreditCard, Loader2, MapPin, Truck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { searchAddresses, extractAddressComponents } from '@/utils/addressAutocomplete';
import { calculateRequiredLockerSize, LOCKER_SIZES } from '@/utils/courierServices';

const PAYFAST_STORAGE_KEY = 'payfast:lastPaymentId';
const DEFAULT_SHIPPING_METHOD = 'standard';
const SHIPPING_METHOD_MAP = {
  'door-to-door': 'standard',
  collection: 'collection',
  pudo: 'pudo',
};

export default function CheckoutPage() {
  const { cart, loading: cartLoading } = useCart();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemsBySeller, setItemsBySeller] = useState({});
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    company: '',
    address: '',
    apartment: '',
    city: '',
    province: '',
    postalCode: '',
    paymentMethod: 'payfast',
    customerNotes: '',
  });
  const [shippingQuotes, setShippingQuotes] = useState({ status: 'idle', data: null, error: null });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSelectionLocked, setAddressSelectionLocked] = useState(false);
  const [addressSearchState, setAddressSearchState] = useState({ status: 'idle', error: null });
  const [shippingOption, setShippingOption] = useState('door-to-door');
  const [shippingAvailability, setShippingAvailability] = useState({
    doorToDoor: true,
    collection: false,
    pudo: false,
  });
  const [pudoSearchTerm, setPudoSearchTerm] = useState('');
  const [pudoLockers, setPudoLockers] = useState({ status: 'idle', data: [], error: null });
  const [selectedPudoLocker, setSelectedPudoLocker] = useState(null);

  const clearFieldError = (field) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  // Set email when session loads
  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({
        ...prev,
        email: session.user.email
      }));
    }
  }, [session]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/checkout');
    }
  }, [status, router]);

  const canFetchShippingQuotes = shippingOption === 'door-to-door' && Boolean(
    formData.address &&
    formData.city &&
    formData.province &&
    formData.postalCode &&
    formData.fullName &&
    formData.email &&
    cart?.items?.length
  );

  // Group items by seller when cart loads
  useEffect(() => {
    if (cart?.items) {
      groupItemsBySeller();
    }
  }, [cart]);

  useEffect(() => {
    if (!cart?.items || cart.items.length === 0) {
      setShippingAvailability({ doorToDoor: true, collection: false, pudo: false });
      if (shippingOption !== 'door-to-door') {
        setShippingOption('door-to-door');
      }
      return;
    }

    const collectionEligible = cart.items.every((item) =>
      item.product?.deliveryOptions?.collection === 'collection-allowed'
    );
    const pudoEligible = cart.items.every((item) =>
      Array.isArray(item.product?.deliveryOptions?.methods) &&
      item.product.deliveryOptions.methods.includes('pudo')
    );

    setShippingAvailability({
      doorToDoor: true,
      collection: collectionEligible,
      pudo: pudoEligible,
    });

    if (shippingOption === 'pudo' && !pudoEligible) {
      setShippingOption(collectionEligible ? 'collection' : 'door-to-door');
    } else if (shippingOption === 'collection' && !collectionEligible) {
      setShippingOption(pudoEligible ? 'pudo' : 'door-to-door');
    }
  }, [cart?.items, shippingOption]);

  useEffect(() => {
    if (pudoSearchTerm) return;
    const fallback = formData.postalCode || formData.city || '';
    if (fallback) {
      setPudoSearchTerm(fallback);
    }
  }, [formData.postalCode, formData.city, pudoSearchTerm]);

  // Fetch address suggestions from Mapbox when street address input changes
  useEffect(() => {
    if (shippingOption !== 'door-to-door') {
      setAddressSuggestions([]);
      setAddressSearchState({ status: 'idle', error: null });
      return;
    }

    if (addressSelectionLocked) {
      setAddressSuggestions([]);
      setAddressSearchState(prev => (prev.status === 'idle' && !prev.error ? prev : { status: 'idle', error: null }));
      return;
    }

    const query = formData.address?.trim();

    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setAddressSearchState(prev => (prev.status === 'idle' && !prev.error ? prev : { status: 'idle', error: null }));
      return;
    }

    let isActive = true;
    const timeoutId = setTimeout(async () => {
      setAddressSearchState({ status: 'loading', error: null });
      try {
        const results = await searchAddresses(query);
        if (!isActive) return;
        setAddressSuggestions(results || []);
        setAddressSearchState({ status: 'success', error: null });
      } catch (error) {
        if (!isActive) return;
        setAddressSuggestions([]);
        setAddressSearchState({ status: 'error', error: error.message || 'Failed to fetch suggestions' });
      }
    }, 400);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [formData.address, shippingOption, addressSelectionLocked]);

  // Fetch live courier quotes when address is ready
  useEffect(() => {
    if (!canFetchShippingQuotes) {
      setShippingQuotes(prev => (prev.status === 'idle' && !prev.data ? prev : { status: 'idle', data: null, error: null }));
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setShippingQuotes(prev => ({ ...prev, status: 'loading', error: null }));
      try {
        const res = await fetch('/api/checkout/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shippingAddress: {
              fullName: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              company: formData.company,
              address: formData.address,
              apartment: formData.apartment,
              city: formData.city,
              province: formData.province,
              postalCode: formData.postalCode,
            },
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          throw new Error(errorBody.error || 'Failed to fetch courier quotes');
        }

        const data = await res.json();
        setShippingQuotes({ status: 'success', data, error: null });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setShippingQuotes({ status: 'error', data: null, error: error.message || 'Unable to load courier quotes' });
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [canFetchShippingQuotes, formData.address, formData.city, formData.province, formData.postalCode, formData.fullName, formData.email, formData.phone, formData.company, formData.apartment, shippingOption]);

  const groupItemsBySeller = () => {
    const grouped = {};

    cart.items.forEach(item => {
      const sellerId = item.product?.owner?._id || item.product?.owner || 'unknown';
      const sellerName = item.product?.ownerName || item.productSnapshot?.ownerName || 'Unknown Seller';

      if (!grouped[sellerId]) {
        grouped[sellerId] = {
          sellerId,
          sellerName,
          items: [],
          subtotal: 0,
        };
      }

      grouped[sellerId].items.push(item);
      grouped[sellerId].subtotal += item.price * item.quantity;
    });

    setItemsBySeller(grouped);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'address') {
      setAddressSelectionLocked(false);
    }

    // Clear error for this field
    clearFieldError(name);
  };

  const handleAddressSuggestionSelect = (suggestion) => {
    if (!suggestion) return;
    const components = extractAddressComponents(suggestion);
    setAddressSuggestions([]);
    setAddressSearchState({ status: 'idle', error: null });
    setAddressSelectionLocked(true);

    setFormData(prev => ({
      ...prev,
      address: components.address || suggestion.label || prev.address,
      city: components.city || prev.city,
      province: components.province || prev.province,
      postalCode: components.zipCode || prev.postalCode,
    }));
  };

  const handleShippingOptionChange = (option) => {
    setShippingOption(option);
    setAddressSelectionLocked(false);
    if (option !== 'door-to-door') {
      setShippingQuotes({ status: 'idle', data: null, error: null });
      setAddressSuggestions([]);
      setAddressSearchState({ status: 'idle', error: null });
    }
    if (option !== 'pudo') {
      setSelectedPudoLocker(null);
      setPudoLockers({ status: 'idle', data: [], error: null });
      clearFieldError('selectedPudoLocker');
    }
  };

  const toDisplayText = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return '';
  };

  const buildAddressString = (value) => {
    if (!value && value !== 0) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map(item => (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join(', ');
    }
    if (typeof value === 'object') {
      const keys = [
        'entered_address',
        'street_address',
        'streetAddress',
        'address1',
        'address2',
        'local_area',
        'city',
        'code',
        'zone',
        'country',
      ];
      const parts = [];
      for (const key of keys) {
        const part = value[key];
        if (typeof part === 'string' && part.trim()) {
          parts.push(part.trim());
        }
      }
      return parts.join(', ');
    }
    return '';
  };

  const normalizeLocker = (locker) => {
    if (!locker) return null;
    const pickupPointId = locker.pickupPointId || locker.pickup_point_id || locker.id || locker.locker_id || locker.code || locker.identifier;
    const id = pickupPointId || `${locker.name || 'locker'}-${locker.postal_code || locker.postalCode || locker.city || Date.now()}`;
    const addressSource = typeof locker.address === 'object' ? locker.address : null;
    const citySource = toDisplayText(locker.city) || addressSource?.city || addressSource?.local_area;
    const provinceSource = toDisplayText(locker.province) || addressSource?.zone || addressSource?.province;
    const postalSource = toDisplayText(locker.postal_code || locker.postalCode) || addressSource?.code;

    return {
      id,
      pickupPointId: pickupPointId || id,
      pickupPointProvider: locker.pickupPointProvider || locker.pickup_point_provider || 'tcg-locker',
      name: toDisplayText(locker.name || locker.site_name || locker.locker_name) || 'PUDO Locker',
      address:
        buildAddressString(locker.address) ||
        buildAddressString(locker.street_address) ||
        toDisplayText(locker.location) ||
        '',
      city: citySource || toDisplayText(locker.suburb) || toDisplayText(locker.town) || '',
      province: provinceSource || toDisplayText(locker.state) || '',
      postalCode: postalSource || toDisplayText(locker.zip_code),
      distanceKm: locker.distance || locker.distance_km || locker.distanceKm || null,
      status: toDisplayText(locker.status || locker.availability || locker.state) || 'unknown',
      raw: locker,
    };
  };

  const extractLockerResults = (payload, depth = 0) => {
    if (!payload || depth > 5) return [];

    if (Array.isArray(payload)) {
      return payload;
    }

    const candidateKeys = [
      'results',
      'data',
      'items',
      'pickup_points',
      'pickupPoints',
      'lockers',
    ];

    for (const key of candidateKeys) {
      if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
      const value = payload[key];
      if (Array.isArray(value)) {
        return value;
      }
      if (value && typeof value === 'object') {
        const nested = extractLockerResults(value, depth + 1);
        if (nested.length) return nested;
      }
    }

    if (typeof payload === 'object') {
      for (const value of Object.values(payload)) {
        if (!value || typeof value !== 'object') continue;
        const nested = extractLockerResults(value, depth + 1);
        if (nested.length) return nested;
      }
    }

    return [];
  };

  const handlePudoLockerSelect = (locker) => {
    setSelectedPudoLocker(locker);
    clearFieldError('selectedPudoLocker');
  };

  const fetchPudoLockers = async () => {
    if (!pudoSearchTerm || !pudoSearchTerm.trim()) {
      setErrors(prev => ({
        ...prev,
        pudoSearch: 'Enter a city or postal code to find lockers',
      }));
      return;
    }

    clearFieldError('pudoSearch');
    setPudoLockers({ status: 'loading', data: [], error: null });
    setSelectedPudoLocker(null);

    try {
      const params = new URLSearchParams({
        search: pudoSearchTerm.trim(),
      });
      const res = await fetch(`/api/courier/pudo-lockers?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to find lockers');
      }
      const data = await res.json();
      const rawLockers = extractLockerResults(data.lockers);

      const normalized = rawLockers
        .map(normalizeLocker)
        .filter(Boolean);

      if (!normalized.length) {
        setPudoLockers({ status: 'empty', data: [], error: 'No lockers found for that area yet' });
        return;
      }

      setPudoLockers({ status: 'success', data: normalized, error: null });
    } catch (error) {
      console.error('Failed to fetch PUDO lockers:', error);
      setPudoLockers({ status: 'error', data: [], error: error.message || 'Failed to fetch lockers' });
      toast({
        title: 'Locker search failed',
        description: error.message || 'Unable to fetch lockers for that area',
        variant: 'destructive',
      });
    }
  };

  const submitPayFastForm = (formData, action) => {
    try {
      if (typeof window !== 'undefined' && formData?.m_payment_id) {
        sessionStorage.setItem(PAYFAST_STORAGE_KEY, formData.m_payment_id);
      }
    } catch (storageError) {
      console.warn('Failed to persist PayFast payment id', storageError);
    }

    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;

    // Add all form fields as hidden inputs
    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    // Append form to body and submit
    document.body.appendChild(form);
    console.log('Submitting PayFast form with data:', formData);
    form.submit();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.fullName) newErrors.fullName = 'Full name is required';

    if (shippingOption === 'door-to-door') {
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.province) newErrors.province = 'Province is required';
      if (!formData.postalCode) newErrors.postalCode = 'Postal code is required';
      else if (!/^\d{4}$/.test(formData.postalCode)) newErrors.postalCode = 'Postal code must be 4 digits';
    }

    if (shippingOption === 'pudo' && !selectedPudoLocker) {
      newErrors.selectedPudoLocker = 'Select a locker for your drop-off and collection';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!session?.user) {
      toast({
        title: "Error",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      router.push('/auth/signin?callbackUrl=/checkout');
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const shippingAddress = (() => {
        if (shippingOption === 'pudo' && selectedPudoLocker) {
          return {
            fullName: formData.fullName.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            company: formData.company.trim(),
            address: selectedPudoLocker.address || 'Selected PUDO Locker',
            apartment: selectedPudoLocker.name || '',
            city: (selectedPudoLocker.city || formData.city).trim(),
            province: (selectedPudoLocker.province || formData.province).trim(),
            postalCode: (selectedPudoLocker.postalCode || formData.postalCode).trim(),
          };
        }

        if (shippingOption === 'collection') {
          return {
            fullName: formData.fullName.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            company: formData.company.trim(),
            address: 'Customer will collect directly from the seller',
            apartment: '',
            city: (formData.city || 'Collection').trim(),
            province: (formData.province || 'Collection').trim(),
            postalCode: (formData.postalCode || '0000').trim(),
          };
        }

        return {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          address: formData.address.trim(),
          apartment: formData.apartment.trim(),
          city: formData.city.trim(),
          province: formData.province.trim(),
          postalCode: formData.postalCode.trim(),
        };
      })();

      const shippingMethod = SHIPPING_METHOD_MAP[shippingOption] || DEFAULT_SHIPPING_METHOD;
      const computedLockerSize = cart?.items ? calculateRequiredLockerSize(cart.items) : 'M';
      const computedLockerPrice = LOCKER_SIZES[computedLockerSize]?.price || 69;
      const lockerSelection = shippingOption === 'pudo' && selectedPudoLocker ? { ...selectedPudoLocker, lockerSize: computedLockerSize, price: computedLockerPrice } : null;

      console.log('Submitting checkout with:', {
        shippingAddress,
        paymentMethod: formData.paymentMethod,
        shippingOption,
        shippingMethod,
        lockerSelected: Boolean(lockerSelection),
      });

      const bestBySeller = shippingQuotes.data?.quotesBySeller
        ? Object.values(shippingQuotes.data.quotesBySeller).reduce((acc, seller) => {
          if (seller?.sellerId && typeof seller?.bestQuote?.price === 'number') {
            acc[seller.sellerId] = Number(seller.bestQuote.price);
          }
          return acc;
        }, {})
        : undefined;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          shippingAddress,
          shippingMethod,
          shippingOption,
          lockerSelection,
          shippingQuotes: bestBySeller ? { bestBySeller, estimatedShipping: shippingQuotes.data?.summary?.estimatedShipping } : undefined,
          paymentMethod: formData.paymentMethod,
          customerNotes: formData.customerNotes.trim(),
        }),
      });

      // Check content type
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response');
        const text = await res.text();
        console.error('Response:', text.substring(0, 500));
        throw new Error('Server error - please try again');
      }

      const data = await res.json();

      if (!res.ok) {
        console.error('Checkout failed:', data);
        // Show detailed error if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map(err =>
            `${err.product || 'Item'}: ${err.error}`
          ).join('\n');
          throw new Error(`${data.error}\n\n${errorMessages}`);
        }
        throw new Error(data.error || data.message || 'Checkout failed');
      }

      // Show success message with order numbers
      const orderNumbers = data.orders?.map(o => o.orderNumber).join(', ') || 'Unknown';
      toast({
        title: "Success!",
        description: `Order created: ${orderNumbers}`,
      });

      // Handle payment submission
      if (formData.paymentMethod === 'payfast' && data.payment) {
        console.log('Submitting to PayFast:', data.payment.formAction);
        // Create and submit PayFast form
        submitPayFastForm(data.payment.formData, data.payment.formAction);
      } else {
        router.push('/dashboard/purchases');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to process checkout. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (status === 'loading' || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900 mt-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900 mt-16">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Button onClick={() => router.push('/products')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const cartItems = cart.items;
  const subtotal = cart.subtotal || 0;
  const taxes = cart.tax || 0;
  const estimatedTotal = subtotal + taxes;
  const estimatedShipping = shippingQuotes.data?.summary?.estimatedShipping;
  const hasEstimatedShipping = shippingOption === 'door-to-door' && typeof estimatedShipping === 'number' && estimatedShipping > 0;

  const requiredLockerSize = cartItems ? calculateRequiredLockerSize(cartItems) : 'M';
  const pudoShippingPrice = LOCKER_SIZES[requiredLockerSize]?.price || 69;

  let totalWithEstimatedShipping = null;
  if (hasEstimatedShipping) {
    totalWithEstimatedShipping = estimatedTotal + estimatedShipping;
  } else if (shippingOption === 'pudo') {
    totalWithEstimatedShipping = estimatedTotal + pudoShippingPrice;
  }

  const checkoutButtonTotal = totalWithEstimatedShipping ?? estimatedTotal;
  const sellerCount = Object.keys(itemsBySeller).length;

  return (
    <div className="pb-12 sm:pb-0 min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Multi-Vendor Notice */}
            {sellerCount > 1 && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <Store className="h-4 w-4" />
                <AlertDescription>
                  You're ordering from {sellerCount} different sellers. Separate orders will be created for each seller.
                </AlertDescription>
              </Alert>
            )}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="your@email.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    placeholder="John Doe"
                    className={errors.fullName ? 'border-red-500' : ''}
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="0821234567"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping & Courier */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping & Courier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Choose how you would like to receive your order. The Courier Guy (Shiplogic) powers both the locker-to-locker
                    and door-to-door experiences, while eligible sellers can offer direct collection.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Final courier pricing is still confirmed with you before dispatch.</li>
                    <li>Tracking or locker PINs are shared as soon as bookings are made.</li>
                    <li>Leave delivery notes at the bottom of this page if you need something specific.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: 'collection',
                      title: 'Option 1 · Collect from Seller',
                      description: 'Arrange pickup directly with the seller once payment clears. No courier fees apply.',
                      available: shippingAvailability.collection,
                      icon: Store,
                    },
                    {
                      id: 'pudo',
                      title: 'Option 2 · PUDO Locker to Locker',
                      description: 'Drop parcels at a locker near you and the seller dispatches to the locker you select.',
                      available: shippingAvailability.pudo,
                      icon: MapPin,
                    },
                    {
                      id: 'door-to-door',
                      title: 'Option 3 · Door to Door Courier',
                      description: 'Courier collects from your address. Live Shiplogic quotes provide an instant estimate.',
                      available: shippingAvailability.doorToDoor,
                      icon: Truck,
                    },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isSelected = shippingOption === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                          } ${!option.available ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="shippingOption"
                          value={option.id}
                          checked={isSelected}
                          disabled={!option.available}
                          onChange={() => option.available && handleShippingOptionChange(option.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-emerald-600" />
                            <p className="font-semibold text-sm">{option.title}</p>
                            {!option.available && (
                              <span className="text-xs text-muted-foreground">Not available for every item in your cart</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {shippingOption === 'collection' && (
                  <div className="rounded-lg border p-4 bg-muted/30 text-sm space-y-2">
                    <p className="font-medium">Collect directly from the seller.</p>
                    <p>
                      We will introduce you to the seller after checkout so you can arrange a pickup time, confirm their
                      address, and note any identification requirements. Bring your order number when collecting.
                    </p>
                  </div>
                )}

                {shippingOption === 'pudo' && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Enter your city and postal code to find PUDO lockers nearby, then select the locker you would like to use.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Enter your city or postal code *</label>
                      <Input
                        type="text"
                        name="pudoSearch"
                        value={pudoSearchTerm}
                        onChange={(e) => setPudoSearchTerm(e.target.value)}
                        placeholder="e.g., 2000 or Kya Sands"
                      />
                    </div>
                    {errors.pudoSearch && <p className="text-xs text-red-500">{errors.pudoSearch}</p>}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={fetchPudoLockers}
                        disabled={pudoLockers.status === 'loading'}
                      >
                        {pudoLockers.status === 'loading' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching lockers...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 mr-2" /> Find lockers
                          </>
                        )}
                      </Button>
                      {pudoLockers.status !== 'idle' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPudoLockers({ status: 'idle', data: [], error: null });
                            setSelectedPudoLocker(null);
                          }}
                        >
                          Clear results
                        </Button>
                      )}
                    </div>
                    {pudoLockers.error && (
                      <p className="text-xs text-red-500">{pudoLockers.error}</p>
                    )}
                    {pudoLockers.status === 'empty' && !pudoLockers.error && (
                      <p className="text-xs text-muted-foreground">No lockers found for that search just yet.</p>
                    )}
                    {pudoLockers.data.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{pudoLockers.data.length} lockers found nearby</span>
                          <span>Scroll to view more</span>
                        </div>
                        <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                          {pudoLockers.data.map((locker) => (
                            <button
                              type="button"
                              key={locker.id}
                              onClick={() => handlePudoLockerSelect(locker)}
                              className={`w-full text-left border rounded-lg p-3 transition-colors ${selectedPudoLocker?.id === locker.id
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                  : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold">{locker.name}</p>
                                  <p className="text-sm text-muted-foreground">{locker.address}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {[locker.city, locker.postalCode].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                                {locker.distanceKm && (
                                  <span className="text-xs text-muted-foreground">{locker.distanceKm} km away</span>
                                )}
                              </div>
                              {locker.status && (
                                <p className="text-xs text-muted-foreground mt-1">Status: {locker.status}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPudoLocker && (
                      <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm">
                        <p className="font-medium">Selected locker:</p>
                        <p>{selectedPudoLocker.name}</p>
                        <p className="text-muted-foreground">{selectedPudoLocker.address}</p>
                      </div>
                    )}
                    {errors.selectedPudoLocker && (
                      <p className="text-xs text-red-500">{errors.selectedPudoLocker}</p>
                    )}
                  </div>
                )}

                {shippingOption === 'door-to-door' && (
                  <div className="space-y-4 border rounded-lg p-4 bg-white dark:bg-zinc-900/60">
                    <div>
                      <label className="block text-sm font-medium mb-1">Company (Optional)</label>
                      <Input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Street Address<span className="text-red-500">*</span></label>
                      <Input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        placeholder="123 Main Street"
                        className={errors.address ? 'border-red-500' : ''}
                      />
                      {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                      {formData.address && formData.address.trim().length >= 3 && (
                        <div className="mt-1 space-y-1">
                          {addressSearchState.status === 'loading' && (
                            <p className="text-xs text-muted-foreground">Searching suggestions...</p>
                          )}
                          {addressSearchState.status === 'error' && (
                            <p className="text-xs text-red-500">{addressSearchState.error}</p>
                          )}
                        </div>
                      )}
                      {addressSuggestions.length > 0 && (
                        <div className="mt-2 border rounded-lg divide-y bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700 dark:divide-zinc-800">
                          {addressSuggestions.slice(0, 5).map((suggestion, index) => (
                            <button
                              key={`${suggestion.value || suggestion.label || index}-${index}`}
                              type="button"
                              onClick={() => handleAddressSuggestionSelect(suggestion)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {suggestion.label || suggestion.value}
                              </p>
                              {suggestion.address?.place_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {suggestion.address.place_name}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Apartment/Suite</label>
                      <Input
                        type="text"
                        name="apartment"
                        value={formData.apartment}
                        onChange={handleInputChange}
                        placeholder="No. 4B"
                      />
                    </div>
                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City<span className="text-red-500">*</span></label>
                        <Input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                          placeholder="Johannesburg"
                          className={errors.city ? 'border-red-500' : ''}
                        />
                        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Province<span className="text-red-500">*</span></label>
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          required
                          className={`w-full px-3 py-2 border rounded-md ${errors.province ? 'border-red-500' : 'border-gray-300'} dark:bg-zinc-800 dark:border-zinc-700`}
                        >
                          <option value="">Select Province</option>
                          <option value="Gauteng">Gauteng</option>
                          <option value="Western Cape">Western Cape</option>
                          <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                          <option value="Eastern Cape">Eastern Cape</option>
                          <option value="Free State">Free State</option>
                          <option value="Limpopo">Limpopo</option>
                          <option value="Mpumalanga">Mpumalanga</option>
                          <option value="Northern Cape">Northern Cape</option>
                          <option value="North West">North West</option>
                        </select>
                        {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Postal Code<span className="text-red-500">*</span></label>
                      <Input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        placeholder="2000"
                        maxLength={4}
                        className={errors.postalCode ? 'border-red-500' : ''}
                      />
                      {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Courier Quotes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {shippingOption !== 'door-to-door' ? (
                  <p className="text-sm text-muted-foreground">
                    Live Shiplogic quotes apply to the door-to-door courier option. Switch to that option above to view
                    real-time estimates.
                  </p>
                ) : (
                  <>
                    {!canFetchShippingQuotes && (
                      <p className="text-sm text-muted-foreground">
                        Enter your full shipping address to see live courier estimates for each seller.
                      </p>
                    )}

                    {canFetchShippingQuotes && shippingQuotes.status === 'loading' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching courier quotes...
                      </div>
                    )}

                    {shippingQuotes.status === 'error' && (
                      <p className="text-sm text-red-500">{shippingQuotes.error}</p>
                    )}

                    {shippingQuotes.status === 'success' && shippingQuotes.data && (
                      <div className="space-y-3">
                        {Object.values(shippingQuotes.data.quotesBySeller || {}).map((seller) => (
                          <div key={seller.sellerId} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{seller.sellerName}</p>
                                {seller.bestQuote ? (
                                  <p className="text-xs text-muted-foreground">
                                    {seller.bestQuote.name || seller.bestQuote.provider} • {seller.bestQuote.service_level || seller.bestQuote.service_level_code || 'Standard'}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No live quote available yet</p>
                                )}
                              </div>
                              {seller.bestQuote && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold">From R{(seller.bestQuote.price ?? 0).toFixed(2)}</p>
                                  {seller.bestQuote.estimatedDays && (
                                    <p className="text-xs text-muted-foreground">~ {seller.bestQuote.estimatedDays} days</p>
                                  )}
                                </div>
                              )}
                            </div>
                            {seller.error && (
                              <p className="text-xs text-red-500 mt-2">{seller.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="payfast"
                    checked={formData.paymentMethod === 'payfast'}
                    onChange={handleInputChange}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-medium">PayFast</p>
                    <p className="text-sm text-muted-foreground">Secure payment via PayFast</p>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Order Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  name="customerNotes"
                  value={formData.customerNotes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions for your order..."
                  className="w-full p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items by Seller */}
                  {Object.values(itemsBySeller).map((seller) => (
                    <div key={seller.sellerId} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Store className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold text-sm">{seller.sellerName}</span>
                      </div>

                      {seller.items.map((item) => (
                        <div key={item._id} className="flex gap-3">
                          <Image
                            src={item.product?.images?.[0] || item.productSnapshot?.image || '/image.png'}
                            alt={item.productSnapshot?.title || 'Product'}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.product?.title || item.productSnapshot?.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × R {item.price}
                            </p>
                            <p className="text-sm font-semibold">
                              R {(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="text-right text-sm">
                        <span className="text-muted-foreground">Seller Subtotal: </span>
                        <span className="font-semibold">R {seller.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      {shippingOption === 'door-to-door' ? (
                        hasEstimatedShipping ? (
                          <span>R {estimatedShipping.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground text-right">Live quote pending</span>
                        )
                      ) : shippingOption === 'pudo' ? (
                        <span>R {pudoShippingPrice.toFixed(2)} ({requiredLockerSize} Locker)</span>
                      ) : (
                        <span className="text-xs text-muted-foreground text-right">Collection - R 0.00</span>
                      )}
                    </div>
                    {taxes > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (15% VAT)</span>
                        <span>R {taxes.toFixed(2)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <div>
                        Estimated total {
                          shippingOption === 'door-to-door'
                            ? hasEstimatedShipping
                              ? '(incl. shipping)'
                              : '(excl. shipping)'
                            : shippingOption === 'collection'
                              ? '(collection)'
                              : '(incl. locker shipping)'
                        }
                      </div>
                      <div>
                        R{(totalWithEstimatedShipping ?? estimatedTotal).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Quotes are preliminary and may change if parcel details differ. Sellers confirm final courier charges before dispatch.
                  </p>

                  {sellerCount > 1 && (
                    <div className="pt-2 text-xs text-muted-foreground">
                      * {sellerCount} separate orders will be created
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-12 text-lg"
              >
                {isSubmitting ? 'Processing...' : `Complete Order (R${checkoutButtonTotal.toFixed(2)})`}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By placing your order, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
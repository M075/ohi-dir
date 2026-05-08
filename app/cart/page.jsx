// app/cart/page.jsx
"use client";
import React, { useState } from 'react';
import { useCart } from '@/assets/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckIcon, ClockIcon, Minus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Loading from '@/app/loading';
import { useSession } from 'next-auth/react';

const policies = [
  {
    name: 'Free returns',
    imageSrc: 'https://tailwindui.com/img/ecommerce/icons/icon-returns-light.svg',
    description: 'Not what you expected? Place it back in the parcel and attach the pre-paid postage stamp.',
  },
  {
    name: 'Same day delivery',
    imageSrc: 'https://tailwindui.com/img/ecommerce/icons/icon-calendar-light.svg',
    description: 'We offer a delivery service that has never been done before. Checkout today and receive your products within hours.',
  },
  {
    name: 'All year discount',
    imageSrc: 'https://tailwindui.com/img/ecommerce/icons/icon-gift-card-light.svg',
    description: 'Looking for a deal? You can use the code "ALLYEAR" at checkout and get money off all year round.',
  },
  {
    name: 'For the planet',
    imageSrc: 'https://tailwindui.com/img/ecommerce/icons/icon-planet-light.svg',
    description: "We've pledged 1% of sales to the preservation and restoration of the natural environment.",
  },
];

export default function CartPage() {
  const { data: session } = useSession();
  const { cart, loading, updateQuantity, removeFromCart } = useCart();
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const subtotal = cart?.subtotal || 0;
  const tax = cart?.tax || 0;
  const estimatedTotal = subtotal + tax;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 mt-20">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Sign in to view cart</h2>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to access your shopping cart
            </p>
            <Link href="/auth/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !cart) {
    return <Loading />;
  }

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(itemId));
    await updateQuantity(itemId, newQuantity);
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleRemove = async (itemId) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    await removeFromCart(itemId);
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 mt-20">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start shopping to add items to your cart
            </p>
            <Link href="/products">
              <Button className="w-full">Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>

          <div className="mt-12">
            <section aria-labelledby="cart-heading">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-800 border-b border-t border-gray-200 dark:border-gray-800">
                {cart.items.map((item) => {
                  const product = item.product;
                  const isUpdating = updatingItems.has(item._id.toString());
                  const inStock = product?.stock >= item.quantity;

                  return (
                    <li key={item._id} className="flex py-6 sm:py-10">
                      <div className="flex-shrink-0">
                        <Link href={`/products/${product?._id}`}>
                          <Image
                            alt={item.productSnapshot.title}
                            src={product?.images?.[0] || item.productSnapshot.image || '/image.png'}
                            width={128}
                            height={128}
                            className="h-24 w-24 rounded-lg object-cover object-center sm:h-32 sm:w-32 cursor-pointer hover:opacity-75 transition-opacity"
                          />
                        </Link>
                      </div>

                      <div className="relative ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                        <div>
                          <div className="flex justify-between sm:grid sm:grid-cols-2">
                            <div className="pr-6">
                              <h3 className="text-sm">
                                <Link
                                  href={`/products/${product?._id}`}
                                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                                >
                                  {product?.title || item.productSnapshot.title}
                                </Link>
                              </h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {product?.ownerName || item.productSnapshot.ownerName}
                              </p>
                            </div>

                            <p className="text-right text-sm font-medium">
                              R {(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center gap-4">
                            <div className="flex items-center border rounded-md">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                                disabled={isUpdating || item.quantity <= 1}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                                disabled={isUpdating || item.quantity >= (product?.stock || 0)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemove(item._id)}
                              disabled={isUpdating}
                              className="text-sm font-medium text-red-600 hover:text-red-500 flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>
                        </div>

                        <p className="mt-4 flex space-x-2 text-sm">
                          {inStock ? (
                            <>
                              <CheckIcon aria-hidden="true" className="h-5 w-5 flex-shrink-0 text-green-500" />
                              <span className="text-gray-700 dark:text-gray-300">In stock</span>
                            </>
                          ) : (
                            <>
                              <ClockIcon aria-hidden="true" className="h-5 w-5 flex-shrink-0 text-gray-300" />
                              <span className="text-red-600">Out of stock</span>
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Order summary */}
            <section aria-labelledby="summary-heading" className="mt-10 sm:mx-24">
              <div className="rounded-lg bg-gray-50 dark:bg-zinc-800 px-4 py-6 sm:p-6 lg:p-8">
                <h2 id="summary-heading" className="sr-only">
                  Order summary
                </h2>

                <div className="flow-root">
                  <dl className="-my-4 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <div className="flex items-center justify-between py-4">
                      <dt className="text-gray-600 dark:text-gray-400">Subtotal</dt>
                      <dd className="font-medium">R {cart.subtotal.toFixed(2)}</dd>
                    </div>
                    <div className="flex items-center justify-between py-4">
                      <dt className="text-gray-600 dark:text-gray-400">Shipping</dt>
                      <dd className="text-sm text-muted-foreground text-right">
                        Calculated at checkout
                      </dd>
                    </div>
                    {tax > 0 && (
                      <div className="flex items-center justify-between py-4">
                        <dt className="text-gray-600 dark:text-gray-400">Tax (15% VAT)</dt>
                        <dd className="font-medium">R {tax.toFixed(2)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-4">
                      <dt className="text-base font-medium">Estimated total (excl. shipping)</dt>
                      <dd className="text-base font-medium">R {estimatedTotal.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Sellers arrange courier collections after checkout. Final shipping charges are confirmed once the courier is booked.
                </p>
              </div>

              <div className="mt-10">
                <Link href="/checkout">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  or{' '}
                  <Link href="/products" className="font-medium text-emerald-600 hover:text-emerald-500">
                    Continue Shopping
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Policy grid */}
      <section aria-labelledby="policies-heading" className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-zinc-800">
        <h2 id="policies-heading" className="sr-only">
          Our policies
        </h2>

        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
            {policies.map((policy) => (
              <div
                key={policy.name}
                className="text-center md:flex md:items-start md:text-left lg:block lg:text-center"
              >
                <div className="md:flex-shrink-0">
                  <div className="flow-root">
                    <img alt="" src={policy.imageSrc} className="-my-1 mx-auto h-24 w-auto" />
                  </div>
                </div>
                <div className="mt-6 md:ml-4 md:mt-0 lg:ml-0 lg:mt-6">
                  <h3 className="text-base font-medium">{policy.name}</h3>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{policy.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
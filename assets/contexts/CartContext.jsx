// assets/contexts/CartContext.jsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/components/hooks/use-toast';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { data: session } = useSession();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart on mount and when user logs in
  useEffect(() => {
    if (session?.user?.id) {
      fetchCart();
    } else {
      setCart(null);
      setCartCount(0);
    }
  }, [session?.user?.id]);

  // Update cart count when cart changes
  useEffect(() => {
    if (cart?.items) {
      const count = cart.items.reduce((total, item) => total + item.quantity, 0);
      setCartCount(count);
    } else {
      setCartCount(0);
    }
  }, [cart]);

  const fetchCart = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!session?.user?.id) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return false;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add to cart');
      }

      const updatedCart = await res.json();
      setCart(updatedCart);
      
      toast({
        title: "Added to cart",
        description: "Item successfully added to your cart",
        variant: "success",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!session?.user?.id) return false;

    try {
      setLoading(true);
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      });

      if (!res.ok) {
        throw new Error('Failed to update quantity');
      }

      const updatedCart = await res.json();
      setCart(updatedCart);
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId) => {
    if (!session?.user?.id) return false;

    try {
      setLoading(true);
      const res = await fetch(`/api/cart?itemId=${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to remove item');
      }

      const updatedCart = await res.json();
      setCart(updatedCart);
      
      toast({
        title: "Removed from cart",
        description: "Item removed successfully",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!session?.user?.id) return false;

    try {
      setLoading(true);
      const res = await fetch('/api/cart/clear', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to clear cart');
      }

      setCart({ items: [], subtotal: 0, tax: 0, shipping: 0, total: 0 });
      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cart,
    cartCount,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
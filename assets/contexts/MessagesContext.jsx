// assets/contexts/MessagesContext.jsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const MessagesContext = createContext();

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    // Return default values if not within provider (prevents errors)
    return {
      unreadCount: 0,
      loading: false,
      refreshUnreadCount: () => {},
    };
  }
  return context;
};

export const MessagesProvider = ({ children }) => {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!session?.user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/messages');
      if (res.ok) {
        const conversations = await res.json();
        const total = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(total);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when user logs in
  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadCount();
      
      // Poll for updates every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [session?.user?.id]);

  const value = {
    unreadCount,
    loading,
    refreshUnreadCount: fetchUnreadCount,
  };

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};
// assets/components/Providers.jsx
"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/assets/contexts/CartContext";
import { MessagesProvider } from "@/assets/contexts/MessagesContext";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class">
        <CartProvider>
          <MessagesProvider>
            <ServiceWorkerRegister />
            {children}
          </MessagesProvider>
        </CartProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
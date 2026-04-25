// assets/components/Navbar2.jsx - Updated mobile navigation
"use client"

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import logo from "@/public/logo.png";
import { ThemeToggle } from "./ThemeProvider";
import { signIn, signOut, useSession, getProviders } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag, Box, User } from 'lucide-react';
import { useCart } from '@/assets/contexts/CartContext';

const navigation = [
  { id: 1, text: "Home", link: "/" },
  { id: 2, text: "Stores", link: "/stores" },
  { id: 3, text: "Products", link: "/products" },
  { id: 4, text: "About", link: "/about" },
];

export default function Navbar2() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [providers, setProviders] = useState(null);
  const { data: session } = useSession();
  const { cartCount } = useCart();

  const profileImage = session?.user?.image;

  // Check if we're on the home page
  const isHomePage = pathname === '/';
  
  // Hide navbar on mobile for all pages except home
  const hideNavbarOnMobile = !isHomePage;

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };

    setAuthProviders();
  }, []);

  return (
    <>
      <header className={`absolute inset-x-0 top-0 z-50 ${hideNavbarOnMobile ? 'hidden sm:block' : ''}`}>
        <nav aria-label="Global" className="flex items-center justify-between p-6 sm:px-8">
          {/* Mobile: Centered logo with ThemeToggle on left */}
          <div className="flex sm:hidden w-full items-center justify-between">
            <ThemeToggle />
            <Link href="/" className="flex-1 flex justify-center">
              <span className="sr-only">Ohi!</span>
              <Image src={logo} alt="logo" className="h-10 w-auto dark:invert" />
            </Link>
            <div className="w-10" /> {/* Spacer for symmetry */}
          </div>

          {/* Desktop: Logo on left */}
          <div className="hidden sm:flex sm:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Ohi!</span>
              <Image src={logo} alt="logo" className="h-10 w-auto dark:invert" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden sm:flex sm:gap-x-12">
            {navigation.map((item) => (
              <Link key={item.id} href={item.link} className="text-sm/6 dark:text-gray-50 text-gray-900 dark:hover:text-emerald-600 hover:text-emerald-600">
                {item.text}
              </Link>
            ))}
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:justify-end items-center gap-2">
            <ThemeToggle />

            {/* Cart icon with badge */}
            {session && (
              <Link href="/cart" className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {!session ? (
              <Link href='/auth/signin'>
                <Button className=" cursor-pointer">
                  Login | Register
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Menu as="div" className="relative">
                  <MenuButton className="flex items-center p-1.5">
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt={session?.user?.name || "profile"}
                      src={profileImage || "/profile.png"}
                      className="h-8 w-8 rounded-full"
                    />
                    {/* <span className="hidden sm:flex sm:items-center">
                      <span aria-hidden="true" className="ml-4 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-50">
                        {session?.user?.name}
                      </span>
                      <ChevronDownIcon aria-hidden="true" className="ml-2 h-5 w-5 text-gray-800 dark:text-gray-100" />
                    </span> */}
                  </MenuButton>

                  <MenuItems className="absolute right-0 z-10 mt-2.5 w-40 origin-top-right rounded-md dark:bg-zinc-900 dark:text-white bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                    <MenuItem>
                      {({ active }) => (
                        <a href="/dashboard" className={`block px-3 py-1 text-sm leading-6 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${active ? 'bg-zinc-50' : ''}`}>
                          Dashboard
                        </a>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <a href="/dashboard/profile" className={`block px-3 py-1 text-sm leading-6 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${active ? 'bg-zinc-50' : ''}`}>
                          Profile
                        </a>
                      )}
                    </MenuItem>
                    
                    <MenuItem>
                      {({ active }) => (
                        <a href="/dashboard/messages" className={`block px-3 py-1 text-sm leading-6 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${active ? 'bg-zinc-50' : ''}`}>
                          Messages
                        </a>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={() => signOut()} className={`w-full text-left block px-3 py-1 text-sm leading-6 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${active ? 'bg-zinc-50' : ''}`}>
                          Sign out
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile bottom navigation */}
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl bg-white/10 dark:bg-zinc-900/10 backdrop-blur-md lg:hidden">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className={`flex flex-col items-center justify-center text-xs ${pathname === '/' ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'}`}>
              <Home className="h-5 w-5" />
              <span className="mt-1">Home</span>
            </Link>

            <Link href="/stores" className={`flex flex-col items-center justify-center text-xs ${pathname === '/stores' ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'}`}>
              <ShoppingBag className="h-5 w-5" />
              <span className="mt-1">Stores</span>
            </Link>

            <Link href="/products" className={`flex flex-col items-center justify-center text-xs ${pathname === '/products' ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'}`}>
              <Box className="h-5 w-5" />
              <span className="mt-1">Products</span>
            </Link>

            {session && (
              <Link href="/cart" className={`flex flex-col items-center justify-center text-xs relative ${pathname === '/cart' ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'}`}>
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
                <span className="mt-1">Cart</span>
              </Link>
            )}

            <Link href={session ? '/dashboard' : '/auth/signin'} className={`flex flex-col items-center justify-center text-xs ${pathname?.startsWith('/dashboard') ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-200'}`}>
              <User className="h-5 w-5" />
              <span className="mt-1">Profile</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
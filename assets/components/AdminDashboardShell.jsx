// assets/components/AdminDashboardShell.jsx - Admin-specific dashboard shell
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import logo from "@/public/logo.png";
import { usePathname } from "next/navigation";
import {
  Package,
  Search,
  Store,
  Users,
  ShoppingCart,
  Wallet,
  Settings,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Admin navigation links
const adminNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard/admin",
    icon: HomeIcon,
  },
  {
    name: "Products",
    href: "/dashboard/admin/products",
    icon: Package,
  },
  {
    name: "Stores",
    href: "/dashboard/admin/stores",
    icon: Store,
  },
  {
    name: "Buyers",
    href: "/dashboard/admin/buyers",
    icon: Users,
  },
  {
    name: "Orders",
    href: "/dashboard/admin/orders",
    icon: ShoppingCart,
  },
  {
    name: "Wallet/Transactions",
    href: "/dashboard/admin/wallet",
    icon: Wallet,
  },
  {
    name: "Settings",
    href: "/dashboard/admin/settings",
    icon: Settings,
  },
];

/**
 * Generate breadcrumbs based on current pathname
 */
function generateBreadcrumbs(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const breadcrumbs = [];
  let currentPath = "";

  parts.forEach((part, index) => {
    currentPath += `/${part}`;
    let label = part.charAt(0).toUpperCase() + part.slice(1);
    
    // Custom labels for common routes
    if (part === "admin") label = "Admin";
    if (part === "dashboard") label = "Dashboard";
    
    breadcrumbs.push({
      label,
      link: currentPath,
    });
  });

  return breadcrumbs;
}

export default function AdminDashboardShell({ children }) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const breadcrumbs = generateBreadcrumbs(pathname);

  // Determine active nav item
  const activeHref = React.useMemo(() => {
    if (!pathname) return null;
    let best = null;
    for (const item of adminNavigation) {
      if (!item.href) continue;
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (!best || item.href.length > best.length) best = item.href;
      }
    }
    if (!best) {
      for (const item of adminNavigation) {
        if (item.href === pathname) return item.href;
      }
    }
    return best;
  }, [pathname]);

  return (
    <>
      <div>
        {/* Mobile sidebar */}
        <Dialog
          open={sidebarOpen}
          onClose={setSidebarOpen}
          className="relative z-50 lg:hidden"
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-zinc-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      aria-hidden="true"
                      className="h-6 w-6 text-white"
                    />
                  </button>
                </div>
              </TransitionChild>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-zinc-900 px-6 pb-4 ring-1 ring-white/10">
                <div className="flex h-16 shrink-0 items-center">
                  <Image
                    alt="Ohi!"
                    src={logo}
                    height={50}
                    width={50}
                    className="h-8 w-auto"
                  />
                </div>
                
                {/* Admin Badge - Mobile */}
                <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                    👑 Admin Dashboard
                  </p>
                </div>

                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {adminNavigation.map((item) => (
                          <li key={item.name}>
                            <a
                              href={item.href}
                              className={classNames(
                                item.href === activeHref
                                  ? "bg-red-600 text-white"
                                  : "text-gray-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-600",
                                "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 items-center"
                              )}
                            >
                              <item.icon
                                aria-hidden="true"
                                className="h-6 w-6 shrink-0"
                              />
                              {item.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>

                    {/* Back to main dashboard link */}
                    <li>
                      <Link
                        href="/dashboard"
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-emerald-600"
                      >
                        ← Back to Dashboard
                      </Link>
                    </li>

                    <li className="mt-auto">
                      <a
                        href="/dashboard/admin/settings"
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
                      >
                        <Cog6ToothIcon
                          aria-hidden="true"
                          className="h-6 w-6 shrink-0"
                        />
                        Settings
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-100 dark:bg-zinc-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Image
                alt="Ohi!"
                src={logo}
                height={60}
                width={60}
                className="ml-4 mt-2 dark:invert"
              />
            </div>
            
            {/* Admin Role Badge */}
            <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                👑 Admin Dashboard
              </p>
            </div>

            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {adminNavigation.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          className={classNames(
                            item.href === activeHref
                              ? "bg-red-600 text-white"
                              : "text-gray-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-600",
                            "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                          )}
                        >
                          <item.icon
                            aria-hidden="true"
                            className="h-6 w-6 shrink-0"
                          />
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>

                {/* Back to main dashboard link */}
                <li>
                  <Link
                    href="/dashboard"
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-emerald-600"
                  >
                    ← Back to Dashboard
                  </Link>
                </li>

                <li className="mt-auto">
                  <a
                    href="/dashboard/admin/settings"
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Cog6ToothIcon
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0"
                    />
                    Settings
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72 sm:mt-20">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-800 bg-zinc-100 dark:bg-zinc-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>

            <div
              aria-hidden="true"
              className="h-6 w-px bg-zinc-900/10 lg:hidden"
            />

            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href={breadcrumb.link}>{breadcrumb.label}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px] md:justify-end"
              />
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function HeroSection() {
  return (
    <>
      <section className="relative w-full pb-10 -mt-8 md:py-14" data-oid="ojxzx24">
        <div
          className="absolute top-0 inset-x-0 h-24 flex items-start"
          data-oid="ef2.ell"
        >
          <div
            className="h-4 md:h-24 w-2/3 bg-gradient-to-br from-emerald-500 opacity-20 blur-2xl dark:from-emerald-500 dark:invisible dark:opacity-40"
            data-oid="bjik9br"
          ></div>
          <div
            className="h-6 md:h-20 w-3/5 bg-gradient-to-r from-emerald-500 opacity-40 blur-2xl dark:from-emerald-500 dark:opacity-40"
            data-oid="m4g0puw"
          ></div>
        </div>
        <div
          className="mx-auto lg:max-w-7xl w-full px-5 sm:px-10 md:px-12 lg:px-5 relative"
          data-oid="t82.04_"
        >
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-44 left-0 hidden dark:flex"
            data-oid="a-d5an0"
          >
            <div
              className="h-full md:h-1/2 lg:h-full w-full bg-gradient-to-tr opacity-40 dark:blur-2xl dark:from-emerald-500 dark:opacity-20"
              data-oid="-87xww-"
            ></div>
          </div>
          <div
            className="grid lg:grid-cols-2 relative pt-10 md:pt-24 lg:max-w-none max-w-2xl md:max-w-3xl mx-auto"
          >
            {/* Text on left */}
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
          <div className="mt-24 lg:mt-0">
            <a href="#" className="inline-flex space-x-6">
              <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-semibold leading-6 text-emerald-600 ring-1 ring-inset ring-indigo-600/10">
                What's new
              </span>
              <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600">
                <span>Just shipped v1.0</span>
                <ChevronRightIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
              </span>
            </a>
          </div>
          <h1 className="mt-10 text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl">
            A Central Marketplace <br />for your <br /> Home Business
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Connect with local customers and grow your home business with Ohi! - the all-in-one marketplace designed to connect buyers and sellers.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Button variant='success'
            >
              Get started
            </Button>
            <a href="#" className="text-sm leading-6 text-gray-900 dark:text-gray-100">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

            {/* Images on right */}
            <div className="lg:h-full hidden md:flex" data-oid="ixqgby2">
              <div
                className="flex w-full h-96 min-h-[24rem] lg:min-h-[none] lg:w-full lg:h-full items-center relative"
                data-oid="6yqkwql"
              >
                <div
                  className="absolute z-0 top-1/2 -translate-y-1/2 w-5/6 right-0 h-[calc(80%+20px)] bg-gradient-to-tr opacity-25 from-emerald-500 to-pink-300 dark:from-[#570cac] dark:to-emerald-500 blur-2xl"
                  data-oid="v_yoclv"
                ></div>
                <div
                  className="absolute w-3/5 h-full z-10 p-1 -translate-y-1/2 top-1/2 right-3 rounded-3xl bg-whitee dark:bg-gray-950  shadow-lg shadow-gray-100 dark:shadow-transparent  border border-gray-200 dark:border-gray-800"
                  data-oid="43y6ne7"
                >
                  <Image
                    src="https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?q=80&w=1530&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="In studio"
                    width={900}
                    height={900}
                    loading="lazy"
                    className="w-full h-full rounded-2xl object-cover objet-left"
                    data-oid="ul286bg"
                  />
                </div>
                <div
                  className="absolute -translate-y-1/2 top-1/2 h-[calc(80%-2rem)] w-[calc(40%-20px)] p-1 rounded-3xl bg-white dark:bg-gray-950  shadow-lg shadow-gray-100 dark:shadow-transparent  border border-gray-200 dark:border-gray-800"
                  data-oid="yys_hi5"
                >
                  <Image
                    src="https://images.unsplash.com/photo-1633878353683-c621100b29a4?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Happy in studio"
                    width={900}
                    height={900}
                    loading="lazy"
                    className="w-full h-full rounded-2xl object-cover object-right"
                    data-oid=":2emqyl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

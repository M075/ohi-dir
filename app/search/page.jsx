"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/assets/components/ProductCard";
import StoreCard from "@/assets/components/StoreCard";
import Loading from "@/app/loading";
import Link from "next/link";
import Image from "next/image";
const SearchResults = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState({ products: [], sellers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchInput, setSearchInput] = useState(query);
  const fetchSearchResults = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ products: [], sellers: [] });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch search results");
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (query) {
      setSearchInput(query);
      fetchSearchResults(query);
    }
  }, [query, fetchSearchResults]);
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };
  const totalProducts = results.products?.length || 0;
  const totalSellers = results.sellers?.length || 0;
  const totalResults = totalProducts + totalSellers;
  return (
    <section className="md:mt-12 bg-white dark:bg-zinc-950 min-h-screen">
      {" "}
      {/* Search Header */}{" "}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-8 pb-4">
        {" "}
        <div className="max-w-2xl mx-auto">
          {" "}
          <form
            onSubmit={handleSearch}
            className="relative z-10 flex space-x-3 p-3 bg-white border rounded-lg shadow-lg shadow-gray-100 dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-gray-900/20"
          >
            {" "}
            <div className="flex-[1_0_0%]">
              {" "}
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="py-2.5 px-4 block w-full border-transparent rounded-lg focus:border-emerald-500 focus:ring-emerald-500 dark:bg-neutral-900 dark:border-transparent dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                placeholder="Search for products or stores..."
              />{" "}
            </div>{" "}
            <button
              type="submit"
              className="size-[46px] inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {" "}
              <svg
                className="flex-shrink-0 size-5"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {" "}
                <circle cx="11" cy="11" r="8" />{" "}
                <path d="m21 21-4.3-4.3" />{" "}
              </svg>{" "}
            </button>{" "}
          </form>{" "}
        </div>{" "}
      </div>{" "}
      {/* Results */}{" "}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-16">
        {" "}
        {loading && <Loading />}{" "}
        {!loading && query && (
          <>
            {" "}
            {/* Results summary */}{" "}
            <div className="mb-6">
              {" "}
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {" "}
                Search results for &ldquo;{query}&rdquo;{" "}
              </h2>{" "}
              {!error && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {" "}
                  {totalResults} result{totalResults !== 1 ? "s" : ""} found (
                  {totalProducts} product{totalProducts !== 1 ? "s" : ""},{" "}
                  {totalSellers} seller{totalSellers !== 1 ? "s" : ""}){" "}
                </p>
              )}{" "}
            </div>{" "}
            {/* Error state */}{" "}
            {error && (
              <div className="text-center py-12">
                {" "}
                <p className="text-red-500 text-lg">Error: {error}</p>{" "}
              </div>
            )}{" "}
            {/* Tab navigation */}{" "}
            {!error && totalResults > 0 && (
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                {" "}
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "all" ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                >
                  {" "}
                  All ({totalResults}){" "}
                </button>{" "}
                <button
                  onClick={() => setActiveTab("products")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "products" ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                >
                  {" "}
                  Products ({totalProducts}){" "}
                </button>{" "}
                <button
                  onClick={() => setActiveTab("sellers")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "sellers" ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                >
                  {" "}
                  Sellers ({totalSellers}){" "}
                </button>{" "}
              </div>
            )}{" "}
            {/* No results */}{" "}
            {!error && totalResults === 0 && (
              <div className="text-center py-16">
                {" "}
                <svg
                  className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {" "}
                  <circle cx="11" cy="11" r="8" />{" "}
                  <path d="m21 21-4.3-4.3" />{" "}
                </svg>{" "}
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                  {" "}
                  No results found{" "}
                </h3>{" "}
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {" "}
                  We couldn't find any products or sellers matching your search.
                  Try different keywords.{" "}
                </p>{" "}
                <div className="mt-6 flex justify-center gap-4">
                  {" "}
                  <Link
                    href="/products"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    {" "}
                    Browse all products{" "}
                    <span aria-hidden="true"> &rarr;</span>{" "}
                  </Link>{" "}
                  <Link
                    href="/stores"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    {" "}
                    Browse all stores{" "}
                    <span aria-hidden="true"> &rarr;</span>{" "}
                  </Link>{" "}
                </div>{" "}
              </div>
            )}{" "}
            {/* Products section */}{" "}
            {(activeTab === "all" || activeTab === "products") &&
              totalProducts > 0 && (
                <div className="mb-10">
                  {" "}
                  {activeTab === "all" && (
                    <div className="flex items-center justify-between mb-4">
                      {" "}
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {" "}
                        Products{" "}
                      </h3>{" "}
                      <Link
                        href={`/products?search=${encodeURIComponent(query)}`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                      >
                        {" "}
                        View all products{" "}
                        <span aria-hidden="true"> &rarr;</span>{" "}
                      </Link>{" "}
                    </div>
                  )}{" "}
                  <div className="-mx-4 sm:mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {" "}
                    {results.products.map((product, i) => (
                      <ProductCard key={product._id || i} product={product} />
                    ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
            {/* Sellers section */}{" "}
            {(activeTab === "all" || activeTab === "sellers") &&
              totalSellers > 0 && (
                <div className="mb-10">
                  {" "}
                  {activeTab === "all" && (
                    <div className="flex items-center justify-between mb-4">
                      {" "}
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {" "}
                        Sellers{" "}
                      </h3>{" "}
                      <Link
                        href={`/stores?search=${encodeURIComponent(query)}`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                      >
                        {" "}
                        View all sellers{" "}
                        <span aria-hidden="true"> &rarr;</span>{" "}
                      </Link>{" "}
                    </div>
                  )}{" "}
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {" "}
                    {results.sellers.map((seller) => (
                      <Link
                        key={seller._id}
                        href={`/stores/${seller._id}`}
                        className="group block"
                      >
                        {" "}
                        <div className="relative flex flex-col items-center p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow duration-200">
                          {" "}
                          <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 mb-3">
                            {" "}
                            {seller.image ? (
                              <Image
                                src={seller.image}
                                alt={seller.storename}
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                {" "}
                                <svg
                                  className="h-10 w-10"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.5"
                                  stroke="currentColor"
                                >
                                  {" "}
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.22-.612-7.499-1.632z"
                                  />{" "}
                                </svg>{" "}
                              </div>
                            )}{" "}
                          </div>{" "}
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {" "}
                            {seller.storename}{" "}
                          </h4>{" "}
                          {seller.isVerifiedSeller && (
                            <span className="mt-1 inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                              {" "}
                              <svg
                                className="h-3.5 w-3.5 mr-1"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                {" "}
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                  clipRule="evenodd"
                                />{" "}
                              </svg>{" "}
                              Verified{" "}
                            </span>
                          )}{" "}
                          {(seller.city || seller.province) && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {" "}
                              {[seller.city, seller.province]
                                .filter(Boolean)
                                .join(", ")}{" "}
                            </p>
                          )}{" "}
                          {seller.about && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 text-center">
                              {" "}
                              {seller.about}{" "}
                            </p>
                          )}{" "}
                        </div>{" "}
                      </Link>
                    ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
          </>
        )}{" "}
        {!query && !loading && (
          <div className="text-center py-16">
            {" "}
            <p className="text-gray-500 dark:text-gray-400">
              {" "}
              Enter a search term to find products and sellers.{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </section>
  );
};
const SearchPage = () => {
  return (
    <Suspense fallback={<Loading />}>
      {" "}
      <SearchResults />{" "}
    </Suspense>
  );
};
export default SearchPage;

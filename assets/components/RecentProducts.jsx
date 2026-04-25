import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { useProducts } from "../hooks/useProductsHook";
import Loading from "@/app/loading";

const RecentProducts = () => {
  const { products } = useProducts();

  // if (loading) return <Loading/>;
  // if (error) return <div>Error: {error}</div>;

  const recentProducts = products
    .sort(() => Math.random() - Math.random())
    .slice(0, 3);

  return (
    <div data-oid="gc.-42-">
      <section className="px-4 py-6" data-oid="kluqmzc">
        <div className="container-xl lg:container m-auto" data-oid="5816rjo">
          <h2
            className="text-3xl font-bold text-emerald-500 mb-6 text-center"
            data-oid="ftn7h2d"
          >
            Recent Products
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            data-oid="kkbie5i"
          >
            {recentProducts.map((product, index) => (
              <ProductCard product={product} key={index} data-oid="9yig2h2" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RecentProducts;

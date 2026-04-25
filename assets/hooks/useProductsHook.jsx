// "use client";
// This hook fixes products loading issue, prevents abnormal behaviour
import { useState, useEffect } from "react";
import { fetchProducts } from "@/assets/hooks/fetchProducts";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const fetchedProducts = await fetchProducts();
        if (isMounted) {
          setProducts(fetchedProducts);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return { products, loading, error };
}

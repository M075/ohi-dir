// api.js - Fixed version
export async function fetchProducts() {
  try {
    // Use relative path for same-origin API calls
    const res = await fetch('/api/products', {
      cache: "no-store",
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Products fetched successfully:', data.length);
    return data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

// Fetch a single product
export async function fetchProduct(id) {
  try {
    if (!id) {
      throw new Error("Product ID is required");
    }

    console.log("Fetching product ID:", id);
    
    // Use relative path for same-origin API calls
    const url = `/api/products/${id}`;
    console.log("Fetching from URL:", url);
    
    const res = await fetch(url, {
      cache: "no-store"
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch product: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log("Product data received:", data);
    
    return data;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
}
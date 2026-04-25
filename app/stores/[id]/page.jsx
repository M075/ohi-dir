"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Calendar, Store } from "lucide-react";
import ProductCard from "@/assets/components/ProductCard";
import Loading from "@/app/loading";
import ChatWithSellerButton from "@/assets/components/ChatWithSellerButton";

const StoreDetailPage = () => {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);

        // Fetch store details
        const storeResponse = await fetch(`/api/stores/${id}`);
        if (!storeResponse.ok) throw new Error("Store not found");
        const storeData = await storeResponse.json();
        setStore(storeData);

        // Fetch store products
        const productsResponse = await fetch(`/api/products/user/${id}`);
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStoreData();
    }
  }, [id]);

  if (loading) return <Loading />;
  if (error)
    return <div className="mt-20 p-8 text-center text-red-500">{error}</div>;
  if (!store)
    return <div className="mt-20 p-8 text-center">Store not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Cover image */}
      <div className="relative w-full h-80 bg-gray-200 dark:bg-zinc-800">
        <Image
          src={store.coverImage || "/coverr.jpg"}
          alt={`${store.storename} cover`}
          fill
          className="object-cover"
        />
        <div className="hidden sm:block absolute inset-0 pointer-events-none bg-gradient-to-b from-white via-transparent to-transparent dark:from-zinc-900/90" />
      </div>

      {/* Avatar centered and overlapping the cover */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="-mt-16 flex flex-col items-center">
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-zinc-900 overflow-hidden">
            <Image
              src={store.image || "/logo.png"}
              alt={store.storename}
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-4">
            {store.storename}
          </h1>
          {/* {store.isVerified && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-800">
              Verified Seller
            </Badge>
          )} */}
          {/* About / Details card below */}
          <div className="w-full md:w-3/4 lg:w-2/3 mt-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    About Store
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {store.about || "No description available"}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="flex items-center gap-2 font-semibold mb-2">
                  <MapPin className="h-5 w-5" />
                    Location</h3>
                  <div className="space-y-2 text-sm">
                    {store.city && (
                      <p className="text-muted-foreground">{store.city}</p>
                    )}
                    {store.province && (
                      <p className="text-muted-foreground">{store.province}</p>
                    )}
                    {store.zipCode && (
                      <p className="text-muted-foreground">{store.zipCode}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <ChatWithSellerButton
                    sellerId={store._id}
                    storeId={store._id}
                    className="w-full"
                  />
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Member since{" "}
                      {new Date(store.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Products section */}
        <div className="py-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold">
              Store Products ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Store className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
                <h3 className="text-xl font-semibold mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">
                  This store hasn't listed any products yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreDetailPage;

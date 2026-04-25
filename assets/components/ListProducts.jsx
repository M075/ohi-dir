"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Pencil, X, PlusCircle, Star, Package } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { toast } from "@/components/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

const ProductsTable = () => {
  const { data: session } = useSession();
  const profileImage = session?.user?.image;
  const profileName = session?.user?.name;
  const profileEmail = session?.user?.email;

  // Add this
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // Fetch user products from API
    const fetchUserProducts = async (userId) => {
      if (!userId) {
        return;
      }

      try {
        const res = await fetch(`/api/products/user/${userId}`, {
          method: "GET",
        });

        if (res.status === 200) {
          const data = await res.json();
          setProducts(data);
          setLoading(false);
        }
      } catch (error) {
        // Handle fetch errors
        console.error(error);
      }
    };

    // Fetch user products when session data is available
    if (session?.user?.id) {
      fetchUserProducts(session.user.id);
    }
  }, [session]);


  const handleDeleteProduct = async (productId) => {
    // const confirmed = window.confirm(
    //   'Are you sure you want to delete this product?'
    // )

    // if (!confirmed) {
    //   return
    // }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (res.status === 200) {
        // Remove product from state
        const updatedProducts = products.filter(
          (product) => product._id !== productId,
        );
        setProducts(updatedProducts);

        toast({
          variant: "success",
          title: "Product Deleted",
          description: "Your product has been deleted successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to delete product",
          description:
            "Something went wrong. Please try again or contact site administrator.",
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (direction) => {
    if (direction === "next") {
      setPage(page + 1);
    } else {
      setPage(page - 1);
    }
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
  };

  return (
    <Card className="sm:w-11/12 mx-auto -mt-4 sm:mt-2 border-none bg-zinc-100 dark:bg-zinc-900" data-oid="y.qvo25">
      <CardHeader className="flex flex-row " data-oid="-um8bbl">
        <CardTitle data-oid="54xqb8g">Products</CardTitle>
        <Link
          className="ml-auto"
          href="/dashboard/products/add"
          data-oid="9yen0nk"
        >
          <Button className="-mt-4" data-oid="33:rv8u">
            <PlusCircle className="sm:mr-2 h-4 w-4" data-oid="zdp2ibn" />
            <span className="hidden sm:block">Add Product</span>
          </Button>
        </Link>
      </CardHeader>
      <CardContent data-oid="_9ki271">
        {products.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center pb-8"
            data-oid="i0:3k8i"
          >
            <p className="text-lg font-bold text-gray-500" data-oid="6o19spt">
              No products found
            </p>
            <p className="text-sm text-gray-400" data-oid="p98rra8">
              Add some products to get started
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {products
                .slice((page - 1) * rowsPerPage, page * rowsPerPage)
                .map((product) => (
                  <div
                    key={product._id}
                    className="flex flex-col sm:flex-row items-center justify-between p-4 border-none bg-white dark:bg-zinc-800 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-20 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 relative">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            width={160}
                            height={120}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground truncate">
                          <span>R{product.price}</span>
                          <span>•</span>
                          <span className='hidden' >Stock: {product.stock}</span>
                          {product.rating > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                {product.rating}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center mt-3 sm:mt-0 sm:ml-4">
                      <Link href={`/dashboard/products/edit/${product._id}`} data-oid="jdygsod">
                        <Button className="mr-2" variant="outline" size="sm" data-oid=".yv3q3d">
                          <Pencil className="h-4 w-4" data-oid="oz3-ukl" />
                        </Button>
                      </Link>

                      <AlertDialog data-oid="0roiuht">
                        <AlertDialogTrigger asChild data-oid="fn6h-8c">
                          <Button variant="destructive" size="sm" data-oid="uvrhks0">
                            <X className="h-4 w-4" data-oid="8_9lp:x" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg rounded-lg" data-oid="7wc_k.6">
                          <AlertDialogHeader data-oid="10a04qt">
                            <AlertDialogTitle data-oid="jgnj8ay">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription data-oid="y_4pfht">
                              This action cannot be undone. This will permanently delete your product and remove your data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter data-oid="k4qa_4p">
                            <AlertDialogCancel data-oid="j_-kb5x">Cancel</AlertDialogCancel>
                            <AlertDialogAction className='border border-red-500 text-red-500 hover:border-red-600 hover:text-red-600' onClick={() => handleDeleteProduct(product._id)}>Continue                           </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-4" data-oid="lm3iczd">
              <div className="flex items-center space-x-2" data-oid="yh8h945">
                <Select onValueChange={handleRowsPerPageChange} defaultValue={rowsPerPage.toString()} data-oid="u:pqi4y">
                  <SelectTrigger className="w-20" data-oid="o6bpkxk">
                    <SelectValue data-oid="o4_z3dc">{rowsPerPage}</SelectValue>
                  </SelectTrigger>
                  <SelectContent data-oid="ppedyrk">
                    <SelectItem value="5" data-oid="i881vp:">5</SelectItem>
                    <SelectItem value="10" data-oid="duckkbs">10</SelectItem>
                    <SelectItem value="20" data-oid="qneu0lm">20</SelectItem>
                  </SelectContent>
                </Select>
                <span data-oid="yf-e8_3"> per page</span>

              </div>
              <div className="flex items-center space-x-2" data-oid="nx2b1ub">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => handlePageChange("prev")} data-oid="kgyydm4">
                  <ChevronLeft data-oid="1edntnp" />
                </Button>
                <span data-oid="phczq-z">{page} of {Math.max(1, Math.ceil(products.length / rowsPerPage))}</span>
                <Button variant="ghost" size="sm" disabled={page === Math.ceil(products.length / rowsPerPage)} onClick={() => handlePageChange("next")} data-oid="rsiw4xn">
                  <ChevronRight data-oid="l1wmxia" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductsTable;

"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { fetchProduct } from "@/assets/hooks/fetchProducts";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Edit2, PlusCircle, Upload, X } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import { PRODUCT_CATEGORIES } from "@/utils/categories";

// Importing UI components from a custom UI library
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUploadCard from "./ImageUploadCard";

const EditProductForm = () => {
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [removedImages, setRemovedImages] = useState([]);
  const [errors, setErrors] = useState({});
  const { id } = useParams();
  const router = useRouter();

  const [fields, setFields] = useState({
    owner: "",
    title: "",
    description: "",
    price: 0,
    discountPercentage: 0,
    rating: 0,
    stock: 0,
    brand: "",
    category: "",
    status: "draft",
    deliveryOptions: {
      methods: [], // Array of: 'pudo', 'door-to-door', 'pargo', 'own-delivery'
      collection: "no-collection", // 'collection-allowed' or 'no-collection'
    },
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
    },
    weight: 0,
    warranty: "",
    shippingOrigin: "",
    featured: "",
    thumbnail: "",
    images: [],
  });

  // Delivery method options
  const deliveryMethods = [
    { id: "pudo", label: "PUDO (Locker to Locker)" },
    { id: "door-to-door", label: "Door to Door" },
    { id: "pargo", label: "Pargo" },
  ];

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const productData = await fetchProduct(id);

        // Migrate old deliveryOptions format to new format if needed
        let deliveryOptions = productData.deliveryOptions;
        if (deliveryOptions) {
          // Check if it's the old format (has 'delivery' and 'collection' booleans)
          if (typeof deliveryOptions.delivery === "boolean") {
            deliveryOptions = {
              methods: deliveryOptions.delivery ? ["door-to-door"] : [],
              collection: deliveryOptions.collection ? "collection-allowed" : "no-collection",
            };
          }
          // Ensure methods is an array
          if (!Array.isArray(deliveryOptions.methods)) {
            deliveryOptions.methods = [];
          }
          // Ensure collection has a valid value
          if (!["collection-allowed", "no-collection"].includes(deliveryOptions.collection)) {
            deliveryOptions.collection = "no-collection";
          }
        } else {
          deliveryOptions = {
            methods: [],
            collection: "no-collection",
          };
        }

        setFields((prev) => ({
          ...prev,
          ...productData,
          deliveryOptions,
          dimensions: {
            length: productData.dimensions?.length || 0,
            width: productData.dimensions?.width || 0,
            height: productData.dimensions?.height || 0,
          },
          weight: productData.weight ?? 0,
        }));
        setPreviewImage(productData.thumbnail);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching product data:", error);
      }
    };

    fetchProductData();
  }, [id]);

  useEffect(() => {
    return () => {
      fields.images.forEach((img) => {
        if (img instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(img));
        }
      });
    };
  }, [fields.images]);

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!fields.title.trim()) {
      newErrors.title = "Product name is required";
    }

    if (!fields.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!fields.category) {
      newErrors.category = "Category is required";
    }

    if (!fields.price || fields.price <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (!fields.stock || fields.stock < 0) {
      newErrors.stock = "Stock must be 0 or greater";
    }

    if (!fields.status) {
      newErrors.status = "Status is required";
    }

    if (fields.images.length === 0) {
      newErrors.images = "At least one product image is required";
    }

    if (fields.deliveryOptions.methods.length === 0 && fields.deliveryOptions.collection === "no-collection") {
      newErrors.deliveryOptions = "Select at least one delivery method or allow collection";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value, index = null, action = "update") => {
    setFields((prev) => {
      if (field === "images") {
        const newImages = [...prev.images];
        if (action === "remove") {
          newImages.splice(index, 1);
        } else if (index !== null) {
          newImages[index] = value[0];
        } else {
          newImages.push(...value);
        }
        return { ...prev, images: newImages };
      }
      return { ...prev, [field]: value };
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === "number" ? (parseFloat(value) || 0) : value;

    if (name.includes(".")) {
      const [outerKey, innerKey] = name.split(".");
      setFields((prevFields) => ({
        ...prevFields,
        [outerKey]: {
          ...prevFields[outerKey],
          [innerKey]: finalValue,
        },
      }));
    } else {
      setFields((prevFields) => ({
        ...prevFields,
        [name]: finalValue,
      }));
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFields((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handler for delivery method checkbox changes
  const handleDeliveryMethodChange = (method, checked) => {
    setFields((prev) => ({
      ...prev,
      deliveryOptions: {
        ...prev.deliveryOptions,
        methods: checked
          ? [...prev.deliveryOptions.methods, method]
          : prev.deliveryOptions.methods.filter((m) => m !== method),
      },
    }));
    if (errors.deliveryOptions) {
      setErrors((prev) => ({ ...prev, deliveryOptions: undefined }));
    }
  };

  // Handler for collection option change
  const handleCollectionChange = (value) => {
    setFields((prev) => ({
      ...prev,
      deliveryOptions: {
        ...prev.deliveryOptions,
        collection: value,
      },
    }));
    if (errors.deliveryOptions) {
      setErrors((prev) => ({ ...prev, deliveryOptions: undefined }));
    }
  };

  const handleRemoveImage = (imageUrl) => {
    setRemovedImages((prev) => [...prev, imageUrl]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }

    const submitButtons = e.target.querySelectorAll('button[type="submit"]');
    submitButtons.forEach((btn) => {
      btn.disabled = true;
      btn.textContent = "Updating...";
    });

    try {
      const formData = new FormData();

      Object.keys(fields).forEach((key) => {
        if (key !== "images" && key !== "deliveryOptions" && key !== "dimensions") {
          formData.append(key, fields[key]);
        }
      });

      formData.append(
        "deliveryOptions",
        JSON.stringify(fields.deliveryOptions),
      );
      formData.append(
        "dimensions",
        JSON.stringify(fields.dimensions),
      );
      formData.append("removedImages", JSON.stringify(removedImages));

      fields.images.forEach((image) => {
        if (image instanceof File) {
          formData.append("images", image);
        }
      });

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const updatedProduct = await res.json();

      toast({
        variant: "success",
        title: "Product Updated",
        description: "Your product has been updated successfully.",
      });

      router.push("/dashboard/products");
    } catch (error) {
      console.error("Update error:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description:
          error.message || "Failed to update product. Please try again.",
      });
    } finally {
      submitButtons.forEach((btn) => {
        btn.disabled = false;
        btn.textContent = "Update Product";
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-oid="0g5lfck">
      <main
        className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8"
        data-oid="mtbs:iv"
      >
        <div
          className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4"
          data-oid=":lo-jck"
        >
          {/* Header section */}
          <div className="flex items-center gap-4" data-oid="mkbneya">
            <Link href="/dashboard/products" data-oid="xftav6m">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                data-oid="6yaoxyt"
              >
                <ChevronLeft className="h-4 w-4" data-oid="b_4i0vs" />
                <span className="sr-only" data-oid="zf81rpd">
                  Back
                </span>
              </Button>
            </Link>
            <h1
              className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0"
              data-oid="n1k61n4"
            >
              Edit Product - {fields.title}
            </h1>
            
            <div
              className="hidden items-center gap-2 md:ml-auto md:flex"
              data-oid="1ifcrm0"
            >
              <Link href="/dashboard/products">
                <Button variant="outline" size="sm" data-oid="hrrlpz6">
                  Discard
                </Button>
              </Link>
              <Button type="submit" size="sm" data-oid="k:b5c-t">
                Update Product
              </Button>
            </div>
          </div>

          {/* Main content grid */}
          <div
            className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8"
            data-oid="ywzmf_8"
          >
            {/* Left column */}
            <div
              className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8"
              data-oid="ee03264"
            >
              {/* Product Details Card */}
              <Card data-oid="hgl4:m2">
                <CardHeader data-oid="s3tfmrn">
                  <CardTitle data-oid="t.n6qku">Product Details</CardTitle>
                  <CardDescription data-oid="h:47:iu">
                    Edit the details of your product
                  </CardDescription>
                </CardHeader>
                <CardContent data-oid="pwfvh7p">
                  <div className="grid gap-6" data-oid="blm92lp">
                    {/* Product name input */}
                    <div className="grid gap-3" data-oid="0bb53tv">
                      <Label htmlFor="name" data-oid="vg1sr3z">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        name="title"
                        className={`w-full ${errors.title ? "border-red-500" : ""}`}
                        placeholder="Enter a name for your product"
                        value={fields.title}
                        onChange={handleChange}
                        data-oid="9x1.kze"
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500">{errors.title}</p>
                      )}
                    </div>
                    {/* Product description textarea */}
                    <div className="grid gap-3" data-oid="sj1u57l">
                      <Label htmlFor="description" data-oid="y66fwd6">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        className={`min-h-32 ${errors.description ? "border-red-500" : ""}`}
                        placeholder="Enter a brief description of the product features and any relevant information."
                        name="description"
                        value={fields.description}
                        onChange={handleChange}
                        data-oid="0vd3rcg"
                      />
                      {errors.description && (
                        <p className="text-sm text-red-500">{errors.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Category Card */}
              <Card data-oid="c.3delu">
                <CardHeader data-oid="fvok.o:">
                  <CardTitle data-oid="f:t8of6">Product Category</CardTitle>
                </CardHeader>
                <CardContent data-oid="o0d:.7r">
                  <div className="grid gap-6 sm:grid-cols-3" data-oid="515ayxa">
                    {/* Category select */}
                    <div className="grid gap-3" data-oid="65f_ijn">
                      <Label htmlFor="category" data-oid="_i9ks_6">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        name="category"
                        value={fields.category}
                        onValueChange={(value) =>
                          handleSelectChange("category", value)
                        }
                        data-oid="-viw3am"
                      >
                        <SelectTrigger 
                          id="category" 
                          className={errors.category ? "border-red-500" : ""}
                          data-oid="ufolcyo"
                        >
                          <SelectValue
                            placeholder="Select category"
                            data-oid="dndso2b"
                          />
                        </SelectTrigger>
                        <SelectContent data-oid="fiq6so:">
                          {PRODUCT_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-sm text-red-500">{errors.category}</p>
                      )}
                    </div>
                    {/* Brand input */}
                    <div className="grid gap-3" data-oid="fa.t-iv">
                      <Label htmlFor="brand" data-oid="wdc3c-7">
                        Brand (optional)
                      </Label>
                      <Input
                        name="brand"
                        placeholder="Product Brand"
                        value={fields.brand}
                        onChange={handleChange}
                        data-oid="dyu.smg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Card */}
              <Card x-chunk="dashboard-07-chunk-1" data-oid="_qdvm__">
                <CardHeader data-oid="xk_gqtj">
                  <CardTitle data-oid=":g-ef56">Stock</CardTitle>
                </CardHeader>
                <CardContent data-oid="ee51f7n">
                  <Table data-oid="27ikmwr">
                    <TableHeader data-oid="srx4_89">
                      <TableRow data-oid="_sy_1ag">
                        <TableHead data-oid="l1ng-u3">Stock <span className="text-red-500">*</span></TableHead>
                        <TableHead data-oid="5-glmr1">Price <span className="text-red-500">*</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody data-oid="g52g8pq">
                      <TableRow data-oid="86zyl1j">
                        <TableCell data-oid="zycoosw">
                          <Label
                            htmlFor="stock-1"
                            className="sr-only"
                            data-oid="a05nl92"
                          >
                            Stock
                          </Label>
                          <Input
                            id="stock-1"
                            type="number"
                            name="stock"
                            placeholder="Enter number of items in stock"
                            value={fields.stock}
                            onChange={handleChange}
                            className={errors.stock ? "border-red-500" : ""}
                            data-oid="rk5simd"
                          />
                          {errors.stock && (
                            <p className="text-sm text-red-500 mt-1">{errors.stock}</p>
                          )}
                        </TableCell>
                        <TableCell data-oid="39-..ie">
                          <Label
                            htmlFor="price-1"
                            className="sr-only"
                            data-oid="0:qq:ue"
                          >
                            Price per product
                          </Label>
                          <Input
                            id="price-1"
                            type="number"
                            placeholder="Enter product price"
                            name="price"
                            value={fields.price}
                            onChange={handleChange}
                            className={errors.price ? "border-red-500" : ""}
                            data-oid="fk6cuoz"
                          />
                          {errors.price && (
                            <p className="text-sm text-red-500 mt-1">{errors.price}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Additional Product Details Card */}
              <Card data-oid="rg0rga-">
                <CardHeader data-oid="l8to-18">
                  <CardTitle data-oid="hljt7yx">
                    Additional Product Details
                  </CardTitle>
                </CardHeader>
                <CardContent data-oid="e_4ioc:">
                  <div className="grid gap-6" data-oid="ut_8:-3">
                    <div className="grid gap-3" data-oid=":cmhesr">
                      <Label data-oid="v509qwr">
                        Product Dimensions (cm)
                      </Label>
                      <p className="-mt-2 text-xs text-muted-foreground">
                        Helps calculate accurate courier quotes.
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="length" className="text-xs text-muted-foreground">Length</Label>
                          <Input
                            id="length"
                            type="number"
                            placeholder="0"
                            name="dimensions.length"
                            value={fields.dimensions?.length}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
                          <Input
                            id="width"
                            type="number"
                            placeholder="0"
                            name="dimensions.width"
                            value={fields.dimensions?.width}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="height" className="text-xs text-muted-foreground">Height</Label>
                          <Input
                            id="height"
                            type="number"
                            placeholder="0"
                            name="dimensions.height"
                            value={fields.dimensions?.height}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        name="weight"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={fields.weight}
                        onChange={handleChange}
                      />
                      
                    </div>

                    <div>
                      <Label htmlFor="warranty" data-oid="k9.:z.q">
                        Warranty
                      </Label>
                      <Input
                        id="warranty"
                        type="text"
                        placeholder="Enter a warranty period, if applicable"
                        name="warranty"
                        value={fields.warranty}
                        onChange={handleChange}
                        data-oid="e5u:c-m"
                      />
                    </div>
                    </div>

                    <div className="grid gap-3" data-oid="c.5sc-:">
                      <Label htmlFor="shipping-origin" data-oid=".qdkwmu">
                        Shipping Origin
                      </Label>
                      <Input
                        id="shipping-origin"
                        type="text"
                        placeholder="Where is this product shipped from?"
                        name="shippingOrigin"
                        value={fields.shippingOrigin}
                        onChange={handleChange}
                        data-oid="on2or3l"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div
              className="grid auto-rows-max items-start gap-4 lg:gap-8"
              data-oid="dvr5tz2"
            >
              {/* Product Status Card */}
              <Card x-chunk="dashboard-07-chunk-3" data-oid="16_:xqb">
                <CardHeader data-oid="slpj:q5">
                  <CardTitle data-oid="rkw6107">Product Status</CardTitle>
                </CardHeader>
                <CardContent data-oid="vy-ewg-">
                  <div className="grid gap-6" data-oid="oxjg-.6">
                    <div className="grid gap-3" data-oid="kmhxi:m">
                      <Label htmlFor="status" data-oid="8bvv79.">
                        Status <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        name="status"
                        value={fields.status}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                        data-oid="y50hn_w"
                      >
                        <SelectTrigger 
                          className={errors.status ? "border-red-500" : ""}
                          data-oid="0_4cahv"
                        >
                          <SelectValue
                            placeholder="Select status"
                            data-oid="gm1nd.u"
                          />
                        </SelectTrigger>
                        <SelectContent data-oid="wk3m9mq">
                          <SelectItem value="draft" data-oid="y5jgu.2">
                            Draft
                          </SelectItem>
                          <SelectItem value="published" data-oid="j_az2re">
                            Active
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.status && (
                        <p className="text-sm text-red-500">{errors.status}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Images Card */}
              <ImageUploadCard
                images={fields.images}
                onChange={handleFieldChange}
                maxImages={5}
                onRemoveImage={handleRemoveImage}
                data-oid="eddtes0"
              />

              {/* <div className='space-y-4'> */}
              {/* Delivery Options Card */}
              <Card data-oid="szcazgk">
                <CardHeader data-oid="7fip7lz">
                  <CardTitle data-oid="pol2dhc">Delivery & Collection Options</CardTitle>
                  <CardDescription>
                    Select available delivery methods and collection options
                  </CardDescription>
                </CardHeader>
                <CardContent data-oid="1nsob.f">
                  <div className="grid gap-6" data-oid="kec8ef-">
                    {/* Delivery Methods */}
                    <div className="grid gap-3">
                      <Label>Delivery Methods</Label>
                      <div className="grid gap-3">
                        {deliveryMethods.map((method) => (
                          <div
                            key={method.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`delivery-${method.id}`}
                              checked={fields.deliveryOptions.methods.includes(method.id)}
                              onCheckedChange={(checked) =>
                                handleDeliveryMethodChange(method.id, checked)
                              }
                            />
                            <Label htmlFor={`delivery-${method.id}`} className="font-normal">
                              {method.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Collection Option */}
                    <div className="grid gap-3">
                      <Label htmlFor="collection-option">Collection Option</Label>
                      <Select
                        value={fields.deliveryOptions.collection}
                        onValueChange={handleCollectionChange}
                      >
                        <SelectTrigger id="collection-option">
                          <SelectValue placeholder="Select collection option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="collection-allowed">
                            Collection Allowed
                          </SelectItem>
                          <SelectItem value="no-collection">
                            No Collection Allowed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {errors.deliveryOptions && (
                      <p className="text-sm text-red-500">{errors.deliveryOptions}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            <div
              className="justify-end items-center gap-2 flex flex-row md:hidden"
              data-oid="1ifcrm0"
            >
              <div>

              <Link href="/dashboard/products">
              <Button variant="outline" size="sm" data-oid="hrrlpz6">
                Discard
              </Button>
              </Link>
              </div>
              <div>
                
              <Button type="submit" size="sm" data-oid="k:b5c-t">
                Update Product
              </Button>
              </div>
            </div>
              {/* </div> */}
            </div>
          </div>
        </div>
      </main>
    </form>
  );
};

export default EditProductForm;

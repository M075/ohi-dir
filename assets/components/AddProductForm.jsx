"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Edit2, PlusCircle, Upload, X } from "lucide-react";
import { useSession } from "next-auth/react";
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

const AddProductForm = () => {
  const { data: session } = useSession();
  
  // State to hold form field values
  const [fields, setFields] = useState({
    owner: "",
    title: "",
    description: "",
    price: 0,
    discountPercentage: 0,
    rating: 0,
    stock: 0,
    brand: "",
    status: "",
    category: "",
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

  // Validation errors state
  const [errors, setErrors] = useState({});

  // Fetch user data on mount to set shipping origin
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`);
          const data = await response.json();
          
          // Set shipping origin to user's city
          if (data.city) {
            setFields(prev => ({
              ...prev,
              shippingOrigin: data.city
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [session?.user?.id]);

  // Keep actual File objects for upload (parallel to fields.images previews)
  const [imageFiles, setImageFiles] = useState([]);
  // Track images removed by the user so server can delete them when editing
  const [removedImages, setRemovedImages] = useState([]);
  // State to hold the currently previewed image
  const [previewImage, setPreviewImage] = useState(null);

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    // Required field validations
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

    // Delivery options validation
    if (fields.deliveryOptions.methods.length === 0 && fields.deliveryOptions.collection === "no-collection") {
      newErrors.deliveryOptions = "Select at least one delivery method or allow collection";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler for input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Convert to number for numeric inputs
    const finalValue = type === 'number' ? parseFloat(value) || 0 : value;

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
  // Handler for select input changes
  const handleSelectChange = (name, value) => {
    setFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
    // Clear error when field is edited
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
    // Clear delivery options error
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
    // Clear delivery options error
    if (errors.deliveryOptions) {
      setErrors((prev) => ({ ...prev, deliveryOptions: undefined }));
    }
  };

  // Handler for image uploads
  const handleImageChange = (e, index) => {
    const { files } = e.target;

    if (files && files.length > 0) {
      const updatedImages = [...fields.images];
      const updatedFiles = [...imageFiles];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = (event) => {
          const imageDataUrl = event.target.result;

          if (typeof index === "number") {
            // Replace existing image preview and file
            updatedImages[index] = imageDataUrl;
            updatedFiles[index] = file;
          } else {
            // Add new image preview and file
            updatedImages.push(imageDataUrl);
            updatedFiles.push(file);
          }

          setFields((prevFields) => ({
            ...prevFields,
            images: updatedImages,
          }));
          setImageFiles(updatedFiles);

          // Clear images error
          if (errors.images) {
            setErrors((prev) => ({ ...prev, images: undefined }));
          }

          // Set preview image
          if (index === undefined || index === updatedImages.length - 1) {
            setPreviewImage(imageDataUrl);
          }
        };

        reader.readAsDataURL(file);
      }
    }
  };

  // Function to remove an image
  const removeImage = (index) => {
    setFields((prevFields) => {
      const newImages = prevFields.images.filter((_, i) => i !== index);

      // Update preview image if necessary
      if (previewImage === prevFields.images[index]) {
        setPreviewImage(newImages.length > 0 ? newImages[0] : null);
      }

      const removed = prevFields.images[index];
      if (removed && typeof removed === "string" && removed.startsWith("http")) {
        setRemovedImages((prev) => [...prev, removed]);
      }

      setImageFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));

      return {
        ...prevFields,
        images: newImages,
      };
    });
  };

  // Handler for image removal (prevents form submission and event bubbling)
  const handleRemoveImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    removeImage(index);
  };

  // Handler for clicking on a thumbnail to set as preview
  const handleThumbnailClick = (image) => {
    setPreviewImage(image);
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    const submitButtons = e.target.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(btn => {
      btn.disabled = true;
      btn.textContent = "Uploading...";
    });

    try {
      const formData = new FormData();

      // Append scalar fields
      formData.append("title", fields.title || "");
      formData.append("description", fields.description || "");
      formData.append("price", fields.price ?? 0);
      formData.append("discountPercentage", fields.discountPercentage ?? 0);
      formData.append("rating", fields.rating ?? 0);
      formData.append("stock", fields.stock ?? 0);
      formData.append("brand", fields.brand || "");
      formData.append("category", fields.category || "");
      formData.append("dimensions", JSON.stringify(fields.dimensions));
      formData.append("warranty", fields.warranty || "");
      formData.append("shippingOrigin", fields.shippingOrigin || "");
      formData.append("weight", fields.weight ?? 0);
      formData.append("featured", fields.featured || "");
      formData.append("status", fields.status || "");

      // Delivery options as JSON
      formData.append(
        "deliveryOptions",
        JSON.stringify(fields.deliveryOptions || {}),
      );

      // Append image files
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (file instanceof File) {
          formData.append("images", file, file.name);
        }
      }

      formData.append("removedImages", JSON.stringify(removedImages || []));

      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Successfully created product - redirect to products page
        window.location.href = "/dashboard/products";
      } else {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      const submitButtons = document.querySelectorAll('button[type="submit"]');
      submitButtons.forEach(btn => {
        btn.disabled = false;
        btn.textContent = "Save Product";
      });
    }
  };

  // Delivery method options
  const deliveryMethods = [
    { id: "pudo", label: "PUDO (Locker to Locker)" },
    { id: "door-to-door", label: "Door to Door" },
    { id: "pargo", label: "Pargo" },
  ];

  return (
    <form
      action="/api/products"
      method="POST"
      encType="multipart/form-data"
      onSubmit={handleOnSubmit}
      data-oid="aew3r_u"
    >
      <main
        className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8"
        data-oid="xdoua1t"
      >
        <div
          className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4"
          data-oid="q_316hm"
        >
          {/* Header section */}
          <div className="flex items-center gap-4" data-oid="2yq568f">
            <Link href='/dashboard/products'>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              data-oid="ax-8rgi"
            >
              <ChevronLeft className="h-4 w-4" data-oid="kufjoac" />
              <span className="sr-only" data-oid="s_lc51b">
                Back
              </span>
            </Button>
            </Link>
            <h1
              className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0"
              data-oid="z4.lna5"
            >
              Add a new Product
            </h1>
            <Badge
              variant="outline"
              className="ml-auto sm:ml-0"
              data-oid="yqw91pm"
            >
              In stock
            </Badge>
            <div
              className="hidden items-center gap-2 md:ml-auto md:flex"
              data-oid="dmkb82:"
            >
              <Link href='/dashboard/products'>
              <Button type='button' variant="outline" size="sm" data-oid="3rhrlyu">
                Discard
              </Button>
              </Link>
              <Button type="submit" size="sm" data-oid="o1fr59-">
                Save Product
              </Button>
            </div>
          </div>

          {/* Main content grid */}
          <div
            className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8"
            data-oid="zw2hv9p"
          >
            {/* Left column */}
            <div
              className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8"
              data-oid="zqdfmlm"
            >
              {/* Product Details Card */}
              <Card data-oid="b8:j1cv">
                <CardHeader data-oid="xs:co1r">
                  <CardTitle data-oid="gng2d_i">Product Details</CardTitle>
                  <CardDescription data-oid="u9wxvj0">
                    Enter the details of your product
                  </CardDescription>
                </CardHeader>
                <CardContent data-oid="yzluyzs">
                  <div className="grid gap-6" data-oid="922vk5l">
                    {/* Product name input */}
                    <div className="grid gap-3" data-oid="igejhe0">
                      <Label htmlFor="name" data-oid="8xel1bo">
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
                        data-oid="wgfqv5e"
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500">{errors.title}</p>
                      )}
                    </div>
                    {/* Product description textarea */}
                    <div className="grid gap-3" data-oid="87j.2p4">
                      <Label htmlFor="description" data-oid="hn.j15q">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        className={`min-h-32 ${errors.description ? "border-red-500" : ""}`}
                        placeholder="Describe features of your product or any relevant information for buyers."
                        name="description"
                        value={fields.description}
                        onChange={handleChange}
                        data-oid="3jkkxnw"
                      />
                      {errors.description && (
                        <p className="text-sm text-red-500">{errors.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Category Card */}
              <Card data-oid="9zzj46g">
                <CardHeader data-oid="xa9n83j">
                  <CardTitle data-oid="pi-aziw">Product Category</CardTitle>
                </CardHeader>
                <CardContent data-oid="316p8mt">
                  <div className="grid gap-6 sm:grid-cols-3" data-oid="idfaiu3">
                    {/* Category select */}
                    <div className="grid gap-3" data-oid="80nzak0">
                      <Label htmlFor="category" data-oid="xfggini">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        name="category"
                        value={fields.category}
                        onValueChange={(value) =>
                          handleSelectChange("category", value)
                        }
                        data-oid="uwjmux5"
                      >
                        <SelectTrigger 
                          id="category" 
                          className={errors.category ? "border-red-500" : ""}
                          data-oid="qyl9h9x"
                        >
                          <SelectValue
                            placeholder="Select category"
                            data-oid="ehx8_cw"
                          />
                        </SelectTrigger>
                        <SelectContent data-oid="v98.u-0">
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
                    <div className="grid gap-3" data-oid="v5t3:hs">
                      <Label htmlFor="brand" data-oid="20o2diu">
                        Brand (optional)
                      </Label>
                      <Input
                        name="brand"
                        placeholder="Product Brand"
                        value={fields.brand}
                        onChange={handleChange}
                        data-oid="r9vyq0u"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Card */}
              <Card x-chunk="dashboard-07-chunk-1" data-oid="-01h2fi">
                <CardHeader data-oid="9wyfw8p">
                  <CardTitle data-oid="57r:x0k">Stock</CardTitle>
                </CardHeader>
                <CardContent data-oid="rctzls7">
                  <Table data-oid="cxu5zg6">
                    <TableHeader data-oid="rde-.y1">
                      <TableRow data-oid="ov47wv5">
                        <TableHead data-oid="9.dwf1q">Stock <span className="text-red-500">*</span></TableHead>
                        <TableHead data-oid="zq1qfwo">Price <span className="text-red-500">*</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody data-oid="1eyt6-e">
                      <TableRow data-oid="7ppkabr">
                        {/* Stock input */}
                        <TableCell data-oid="m:v.frw">
                          <Label
                            htmlFor="stock-1"
                            className="sr-only"
                            data-oid="56v-e_o"
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
                            data-oid="p:9h3.e"
                          />
                          {errors.stock && (
                            <p className="text-sm text-red-500 mt-1">{errors.stock}</p>
                          )}
                        </TableCell>
                        {/* Price input */}
                        <TableCell data-oid="e8p2efp">
                          <Label
                            htmlFor="price-1"
                            className="sr-only"
                            data-oid="dqncg10"
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
                            data-oid="vxmn.nk"
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
              <Card data-oid="j__15_i">
                <CardHeader data-oid="ws3tg3p">
                  <CardTitle data-oid="75w.dr3">
                    Additional Product Details
                  </CardTitle>
                </CardHeader>
                <CardContent data-oid="pnqsx0d">
                  <div className="grid gap-6" data-oid="0ustydf">
                    {/* Dimensions */}
                    <div className="grid gap-3" data-oid="iu84u8t">
                      <Label data-oid=".sh-s3n">
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
                            value={fields.dimensions.width}
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
                            value={fields.dimensions.height}
                            onChange={handleChange}
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Weight */}
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

                    {/* Warranty */}
                    <div>
                      <Label htmlFor="warranty" data-oid="t:blpa7">
                        Warranty
                      </Label>
                      <Input
                        id="warranty"
                        type="text"
                        placeholder="Enter a warranty period, if applicable"
                        name="warranty"
                        value={fields.warranty}
                        onChange={handleChange}
                        data-oid="11p:dma"
                      />
                    </div>
                    </div>

                    {/* Shipping Origin */}
                    <div className="grid gap-3" data-oid="q78yond">
                      <Label htmlFor="shipping-origin" data-oid="isy4bwg">
                        Shipping Origin
                      </Label>
                      <Input
                        id="shipping-origin"
                        type="text"
                        placeholder="Where is this product shipped from?"
                        name="shippingOrigin"
                        value={fields.shippingOrigin}
                        onChange={handleChange}
                        data-oid="2h2zijf"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div
              className="grid auto-rows-max items-start gap-4 lg:gap-8"
              data-oid="c.d3l.."
            >
              {/* Product Status Card */}
              <Card x-chunk="dashboard-07-chunk-3" data-oid="zge4194">
                <CardHeader data-oid="w64fgev">
                  <CardTitle data-oid="fr:4-d8">Product Status</CardTitle>
                </CardHeader>
                <CardContent data-oid="vs:k49q">
                  <div className="grid gap-6" data-oid="kz:mbj.">
                    <div className="grid gap-3" data-oid="c.uj:mq">
                      <Label htmlFor="status" data-oid="df9yt6e">
                        Status <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        name="status"
                        value={fields.status}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                        data-oid="zv_.7hy"
                      >
                        <SelectTrigger 
                          id="status" 
                          className={errors.status ? "border-red-500" : ""}
                          data-oid="7ncy4k3"
                        >
                          <SelectValue
                            placeholder="Select status"
                            data-oid="h6ntapn"
                          />
                        </SelectTrigger>
                        <SelectContent data-oid="r_bqh:q">
                          <SelectItem value="draft" data-oid="3zvikup">
                            Draft
                          </SelectItem>
                          <SelectItem value="published" data-oid="21riv3:">
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
              <Card className="overflow-hidden" data-oid="n3_ef3x">
                <CardHeader data-oid="a97_5z7">
                  <CardTitle data-oid="hz6k95m">
                    Product Images <span className="text-red-500">*</span>
                  </CardTitle>
                  <CardDescription data-oid=":00x9sr">
                    Upload up to 5 images of your product
                  </CardDescription>
                </CardHeader>
                <CardContent data-oid="tb.gwrf">
                  <div className="grid gap-4" data-oid="9h.rqbs">
                    {/* Main preview image */}
                    {(previewImage || fields.images[0]) && (
                      <div className="relative" data-oid="wntu.ha">
                        <Image
                          alt="Product preview"
                          className="aspect-square w-full rounded-md object-cover"
                          height="300"
                          src={previewImage || fields.images[0]}
                          width="300"
                          data-oid="4oh0hza"
                        />

                        {fields.images.length > 0 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={(e) =>
                              handleRemoveImage(
                                e,
                                fields.images.indexOf(previewImage),
                              )
                            }
                            data-oid="nxdxoom"
                          >
                            <X className="h-4 w-4" data-oid="nlcsfxq" />
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Thumbnail images */}
                    <div className="flex flex-wrap gap-5" data-oid="wxblgwp">
                      {fields.images.map((img, index) => (
                        <div
                          key={index}
                          className="relative w-16 h-16 cursor-pointer"
                          onClick={() => handleThumbnailClick(img)}
                          data-oid="pesww6o"
                        >
                          <Image
                            alt={`Product image ${index + 1}`}
                            className="rounded-md object-cover"
                            src={img}
                            layout="fill"
                            data-oid="vunw10x"
                          />

                          <div
                            className="absolute top-1 right-1 flex gap-1"
                            data-oid="jcxaaf9"
                          >
                            {/* Edit image button */}
                            <Label
                              htmlFor={`change-image-${index}`}
                              className="cursor-pointer rounded-full bg-white p-1"
                              data-oid="gtny26t"
                            >
                              <Input
                                id={`change-image-${index}`}
                                type="file"
                                className="hidden"
                                onChange={(e) => handleImageChange(e, index)}
                                accept="image/*"
                                data-oid="p3loz1b"
                              />

                              <Edit2
                                className="h-3 w-3 text-gray-600"
                                data-oid=".xr.2o7"
                              />
                            </Label>
                            {/* Remove image button */}
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-5 w-5 rounded-full p-0"
                              onClick={(e) => handleRemoveImage(e, index)}
                              data-oid="3596hx5"
                            >
                              <X className="h-3 w-3" data-oid="x_46yyi" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {/* Add new image button */}
                      {fields.images.length < 5 && (
                        <Label
                          htmlFor="upload"
                          className={`flex w-16 h-16 hover:cursor-pointer items-center justify-center rounded-md border border-dashed ${errors.images ? "border-red-500" : ""}`}
                          data-oid="rce-c0h"
                        >
                          <Input
                            id="upload"
                            type="file"
                            className="hidden"
                            onChange={handleImageChange}
                            accept="image/*"
                            name="images"
                            multiple
                            data-oid="hkqtwx4"
                          />

                          <Upload
                            className="h-5 w-5 text-muted-foreground"
                            data-oid="sgjlht0"
                          />
                        </Label>
                      )}
                    </div>
                    {errors.images && (
                      <p className="text-sm text-red-500">{errors.images}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Options Card */}
              <Card data-oid=":m04ppq">
                <CardHeader data-oid="n-dy.7a">
                  <CardTitle data-oid="f:eg7zz">Delivery & Collection Options</CardTitle>
                  <CardDescription>
                    Select available delivery methods and collection options
                  </CardDescription>
                </CardHeader>
                <CardContent data-oid="ju9yu6q">
                  <div className="grid gap-6" data-oid="r0oqjyi">
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
                className="justify-end items-center gap-2 flex flex-row sm:hidden"
                data-oid="dmkb82:"
              >
                <Link href="/dashboard/products">
                  <Button type="button" variant="outline" size="sm" data-oid="3rhrlyu">
                    Discard
                  </Button>
                </Link>
                <Button type="submit" size="sm" data-oid="o1fr59-">
                  Save Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </form>
  );
};

export default AddProductForm;

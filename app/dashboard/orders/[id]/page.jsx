"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Package,
  MapPin,
  User,
  CreditCard,
  Truck,
  Search,
  MapPinned,
  Loader2,
  Box,
} from "lucide-react";
import { toast } from "@/components/hooks/use-toast";
import Image from "next/image";
import DashboardShell from "@/assets/components/DashboardShell";
import { useSession } from "next-auth/react";

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800" },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

const LOCKER_SIZE_OPTIONS = [
  { value: "XS", label: "XS – L2LXS - ECO (15×58×7 cm, max 2kg) R49", serviceCode: "L2LXS - ECO", price: 49 },
  { value: "S", label: "S – L2LS - ECO (39×58×7 cm, max 5kg) R59", serviceCode: "L2LS - ECO", price: 59 },
  { value: "M", label: "M – L2LM - ECO (39×58×17 cm, max 10kg) R69", serviceCode: "L2LM - ECO", price: 69 },
  { value: "L", label: "L – L2LL - ECO (39×58×39 cm, max 15kg) R89", serviceCode: "L2LL - ECO", price: 89 },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    status: "",
    trackingNumber: "",
    sellerNotes: "",
  });

  // PUDO Locker states
  const [lockerSearch, setLockerSearch] = useState("");
  const [lockerResults, setLockerResults] = useState([]);
  const [lockerSearching, setLockerSearching] = useState(false);
  const [selectedCollectionLocker, setSelectedCollectionLocker] = useState(null);
  const [selectedLockerSize, setSelectedLockerSize] = useState("M");
  const [bookingPudo, setBookingPudo] = useState(false);

  const isSeller = order?.seller?._id === session?.user?.id;
  const isPudoOrder = order?.fulfillmentOption === "pudo" || order?.shippingMethod === "pudo";

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch order");

      const data = await res.json();
      setOrder(data);
      setFormData({
        status: data.status,
        trackingNumber: data.trackingNumber || "",
        sellerNotes: data.sellerNotes || "",
      });
      // Pre-populate collection locker if already saved
      if (data.collectionLocker) {
        setSelectedCollectionLocker(data.collectionLocker);
      }
      if (data.lockerDetails?.lockerSize) {
        setSelectedLockerSize(data.lockerDetails.lockerSize);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    try {
      setUpdating(true);
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update order");

      const updated = await res.json();
      setOrder(updated);

      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Search for PUDO lockers
  const handleLockerSearch = useCallback(async () => {
    if (!lockerSearch.trim()) return;
    try {
      setLockerSearching(true);
      const res = await fetch(
        `/api/courier/pudo-lockers?search=${encodeURIComponent(lockerSearch.trim())}`
      );
      if (!res.ok) throw new Error("Locker search failed");
      const data = await res.json();
      setLockerResults(Array.isArray(data) ? data : data?.lockers || data?.results || []);
    } catch (error) {
      console.error("Locker search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search lockers. Please try again.",
        variant: "destructive",
      });
      setLockerResults([]);
    } finally {
      setLockerSearching(false);
    }
  }, [lockerSearch]);

  // Book PUDO shipment
  const handleBookPUDO = async () => {
    if (!selectedCollectionLocker) {
      toast({
        title: "Locker Required",
        description: "Please select a drop-off locker first.",
        variant: "destructive",
      });
      return;
    }
    try {
      setBookingPudo(true);
      const selectedOption = LOCKER_SIZE_OPTIONS.find((opt) => opt.value === selectedLockerSize) || LOCKER_SIZE_OPTIONS[2];
      const res = await fetch("/api/courier/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          provider: "pudo",
          service: {
            service_level_code: selectedOption.serviceCode,
          },
          collectionLocker: selectedCollectionLocker,
          lockerSize: selectedLockerSize,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PUDO booking failed");

      setOrder(data.order);
      toast({
        title: "PUDO Shipment Booked!",
        description: `Locker-to-locker shipment created. Tracking: ${data.order.trackingNumber || "N/A"}`,
      });
    } catch (error) {
      console.error("PUDO booking error:", error);
      toast({
        title: "Booking Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBookingPudo(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="text-center py-12">Loading order details...</div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell>
        <div className="text-center py-12">Order not found</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge className={`${statusConfig[order.status]?.color} ml-auto`}>
            {statusConfig[order.status]?.label}
          </Badge>
          {isPudoOrder && (
            <Badge className="bg-orange-100 text-orange-800">PUDO Locker</Badge>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Order Items */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 pb-4 border-b last:border-0"
                    >
                      <div className="w-20 h-20 rounded border overflow-hidden bg-gray-100">
                        <Image
                          src={
                            item.product?.images?.[0] ||
                            item.productSnapshot?.image ||
                            "/image.png"
                          }
                          alt={item.productSnapshot?.title || "Product"}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {item.productSnapshot?.title || "Product"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          R {(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R {item.price} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R {order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>R {order.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>R {order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>R {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PUDO Locker Info - Buyer's Collection Locker
            {isPudoOrder && order.lockerDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5" />
                    Buyer's Collection Locker
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">
                    {order.lockerDetails.lockerName || "PUDO Locker"}
                  </p>
                  <p>{order.lockerDetails.lockerAddress}</p>
                  {order.lockerDetails.distanceKm && (
                    <p className="text-muted-foreground">
                      {order.lockerDetails.distanceKm} km away
                    </p>
                  )}
                  {order.lockerDetails.pickupPointId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Pickup Point ID: {order.lockerDetails.pickupPointId}
                    </p>
                  )}
                </CardContent>
              </Card>
            )} */}

            {/* PUDO Locker Selection — Full width below the grid */}
            {isSeller && isPudoOrder && order.status !== "shipped" && order.status !== "delivered" && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    Select Drop-off Locker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Search for a PUDO locker near you to drop off the buyer&apos;s item.
                  </p>

                  {/* Locker Size + Search — side by side */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Locker Size</Label>
                      <Select
                        value={selectedLockerSize}
                        onValueChange={setSelectedLockerSize}
                        disabled={true}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCKER_SIZE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Search Lockers</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search by city, suburb, or postal code..."
                          value={lockerSearch}
                          onChange={(e) => setLockerSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleLockerSearch()}
                        />
                        <Button
                          onClick={handleLockerSearch}
                          disabled={lockerSearching || !lockerSearch.trim()}
                          variant="outline"
                          size="icon"
                        >
                          {lockerSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Search Results — horizontal scroll */}
                  {lockerResults.length > 0 && (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-64 border rounded-md p-2">
                      {lockerResults.map((locker, idx) => (
                        <button
                          key={locker.pickupPointId || locker.id || idx}
                          onClick={() => setSelectedCollectionLocker(locker)}
                          className={`flex-shrink-0 w-full text-left p-3 rounded-md border transition-colors ${selectedCollectionLocker?.pickupPointId ===
                            (locker.pickupPointId || locker.id)
                            ? "dark:border-emerald-500 dark:bg-emerald-900 border-emerald-500 bg-emerald-100"
                            : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-100 hover:dark:bg-emerald-900 "
                            }`}
                        >
                          <p className="font-medium text-sm truncate">
                            {locker.name || "PUDO Locker"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {locker.address}
                            {locker.city ? `, ${locker.city}` : ""}
                          </p>
                          {locker.distanceKm && (
                            <p className="text-xs text-muted-foreground">
                              {locker.distanceKm} km away
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                            ID: {locker.pickupPointId || locker.id}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Locker + Book Button — side by side */}
                  <div className="grid gap-4 md:grid-cols-2 items-end">
                    

                    <Button
                      onClick={handleBookPUDO}
                      disabled={
                        bookingPudo ||
                        !selectedCollectionLocker ||
                        !selectedLockerSize
                      }
                      className="w-full"
                    >
                      {bookingPudo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Booking PUDO Shipment...
                        </>
                      ) : (
                        "Book PUDO Locker Shipment"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seller's Drop-off Locker (if already selected) */}
            {isPudoOrder && order.collectionLocker && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    Your Drop-off Locker
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">
                    {order.collectionLocker.lockerName || "PUDO Locker"}
                  </p>
                  {order.collectionLocker.lockerAddress && (
                    <p>{order.collectionLocker.lockerAddress}</p>
                  )}
                  {order.collectionLocker.pickupPointId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Pickup Point ID: {order.collectionLocker.pickupPointId}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Notes */}
            {order.customerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.customerNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Management */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">{order.buyer?.storename}</p>
                  <p className="text-muted-foreground">{order.buyerEmail}</p>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{order.shippingAddress?.fullName}</p>
                <p>{order.shippingAddress?.address}</p>
                {order.shippingAddress?.apartment && (
                  <p>{order.shippingAddress.apartment}</p>
                )}
                <p>
                  {order.shippingAddress?.city},{" "}
                  {order.shippingAddress?.province}{" "}
                  {order.shippingAddress?.zipCode}
                </p>
                <p className="text-muted-foreground">
                  {order.shippingAddress?.phone}
                </p>
              </CardContent>
            </Card>

            {order.trackingNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Number:</span>
                    <span className="font-mono text-xs">
                      {order.trackingNumber}
                    </span>
                  </div>
                  {order.courierProvider && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Courier:</span>
                      <span className="font-medium">
                        {order.courierProvider}
                      </span>
                    </div>
                  )}
                  {order.courierReference && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-mono text-xs">
                        {order.courierReference}
                      </span>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <a
                      className="text-indigo-600 hover:underline"
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View live tracking
                    </a>
                  )}
                </CardContent>
              </Card>
            )}


            {/* Update Order (Seller Only) */}
            {isSeller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Update Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Order Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tracking">Tracking Number</Label>
                    <Input
                      id="tracking"
                      value={formData.trackingNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trackingNumber: e.target.value,
                        })
                      }
                      placeholder="Enter tracking number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Seller Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.sellerNotes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellerNotes: e.target.value,
                        })
                      }
                      placeholder="Add notes about this order..."
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleUpdateOrder}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating ? "Updating..." : "Update Order"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

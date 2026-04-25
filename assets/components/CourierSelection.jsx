// assets/components/CourierSelection.jsx
"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Package, Truck, MapPin, Clock } from "lucide-react";
import { toast } from "@/components/hooks/use-toast";

export default function CourierSelection({ order, onBooked }) {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showPudoLockers, setShowPudoLockers] = useState(false);
  const [pudoLockers, setPudoLockers] = useState([]);
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [bookingData, setBookingData] = useState({
    collectionNotes: "",
    deliveryNotes: "",
    parcels: [{
      description: `Order ${order.orderNumber}`,
      weight: 1,
      length: 30,
      width: 30,
      height: 30,
    }],
  });

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courier/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes);
      } else {
        const error = await res.json();
        throw new Error(error?.error || "Failed to fetch quotes");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch courier quotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPudoLockers = async () => {
    try {
      setLoading(true);
      const postalCode = order.shippingAddress?.zipCode || order.shippingAddress?.postalCode || "";
      const res = await fetch(
        `/api/courier/pudo-lockers?postalCode=${encodeURIComponent(postalCode)}&city=${encodeURIComponent(order.shippingAddress.city)}`
      );

      if (res.ok) {
        const data = await res.json();
        setPudoLockers(data.lockers);
        setShowPudoLockers(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch PUDO lockers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookCourier = async () => {
    if (!selectedQuote) {
      toast({
        title: "Error",
        description: "Please select a courier service",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/courier/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          provider: selectedQuote.provider,
          service: selectedQuote,
          ...bookingData,
          lockerId: selectedLocker,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Success",
          description: `Courier booked successfully. Tracking: ${data.order.trackingNumber}`,
        });
        onBooked?.(data.order);
      } else {
        throw new Error("Failed to book courier");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to book courier service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (order) {
      fetchQuotes();
    }
  }, [order]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Select Courier Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && quotes.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No courier quotes available
              </p>
              <Button onClick={fetchQuotes} disabled={loading}>
                Retry
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={selectedQuote?.id}
              onValueChange={(value) => {
                const quote = quotes.find((q) => q.id === value);
                setSelectedQuote(quote);
              }}
            >
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                      selectedQuote?.id === quote.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                        : ""
                    }`}
                    onClick={() => setSelectedQuote(quote)}
                  >
                    <div className="flex items-center gap-4">
                      <RadioGroupItem value={quote.id} id={quote.id} />
                      <div>
                        <p className="font-semibold">{quote.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {quote.estimatedDays || "3-5"} days
                          </span>
                          {quote.service_level && (
                            <Badge variant="outline">{quote.service_level}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          R {(quote.price ?? quote.amount ?? 0).toFixed(2)}
                      </p>
                      {quote.originalPrice && (
                        <p className="text-sm text-muted-foreground line-through">
                          R {quote.originalPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {/* PUDO Locker Option */}
          <div className="mt-6 pt-6 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={fetchPudoLockers}
              disabled={loading}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Deliver to PUDO Locker
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PUDO Lockers */}
      {showPudoLockers && (
        <Card>
          <CardHeader>
            <CardTitle>Select PUDO Locker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pudoLockers.map((locker) => (
                <div
                  key={locker.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                    selectedLocker === locker.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                      : ""
                  }`}
                  onClick={() => setSelectedLocker(locker.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{locker.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {locker.address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {locker.distance} km away
                      </p>
                    </div>
                    <Badge variant={locker.available ? "default" : "secondary"}>
                      {locker.available ? "Available" : "Full"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="parcelWeight">Parcel Weight (kg)</Label>
            <Input
              id="parcelWeight"
              type="number"
              step="0.1"
              value={bookingData.parcels[0].weight}
              onChange={(e) =>
                setBookingData({
                  ...bookingData,
                  parcels: [
                    {
                      ...bookingData.parcels[0],
                      weight: parseFloat(e.target.value),
                    },
                  ],
                })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Length (cm)</Label>
              <Input
                id="length"
                type="number"
                value={bookingData.parcels[0].length}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    parcels: [
                      {
                        ...bookingData.parcels[0],
                        length: parseInt(e.target.value),
                      },
                    ],
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="width">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                value={bookingData.parcels[0].width}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    parcels: [
                      {
                        ...bookingData.parcels[0],
                        width: parseInt(e.target.value),
                      },
                    ],
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={bookingData.parcels[0].height}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    parcels: [
                      {
                        ...bookingData.parcels[0],
                        height: parseInt(e.target.value),
                      },
                    ],
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="collectionNotes">Collection Notes</Label>
            <Textarea
              id="collectionNotes"
              value={bookingData.collectionNotes}
              onChange={(e) =>
                setBookingData({
                  ...bookingData,
                  collectionNotes: e.target.value,
                })
              }
              placeholder="Any special instructions for collection..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="deliveryNotes">Delivery Notes</Label>
            <Textarea
              id="deliveryNotes"
              value={bookingData.deliveryNotes}
              onChange={(e) =>
                setBookingData({
                  ...bookingData,
                  deliveryNotes: e.target.value,
                })
              }
              placeholder="Any special instructions for delivery..."
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleBookCourier}
            disabled={loading || !selectedQuote}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Book Courier
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
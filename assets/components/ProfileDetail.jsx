"use client";
import React, { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession, signIn } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/hooks/use-toast";
import { MapPin, Loader2, CheckCircle2, AlertCircle, Upload, X, Camera, Image as ImageIcon } from "lucide-react";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { searchAddresses, extractAddressComponents } from "@/utils/addressAutocomplete";

const ProfileDetail = () => {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Image upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    storename: "",
    address: "",
    country: "South Africa",
    city: "",
    province: "",
    zipCode: "",
    about: "",
    latitude: null,
    longitude: null,
    geocodedAddress: null,
    geocodedAt: null,
    image: null,
    coverImage: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          setIsLoadingData(true);
          const response = await fetch(`/api/users/${session.user.id}`);
          const data = await response.json();
          setFormData((prevState) => ({
            ...prevState,
            ...data,
          }));
          
          // Set geocode status if coordinates exist
          if (data.latitude && data.longitude) {
            setGeocodeStatus('success');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    fetchUserData();
  }, [session]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.phone) newErrors.phone = "Phone number is required";
    if (!formData.storename) newErrors.storename = "Store name is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.province) newErrors.province = "Province is required";
    if (!formData.zipCode) newErrors.zipCode = "ZIP/Postal code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle address input with autocomplete
  const handleAddressInput = async (value) => {
    setFormData({
      ...formData,
      address: value,
    });
    setGeocodeStatus(null);

    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestions = await searchAddresses(value);
      setAddressSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setAddressSuggestions([]);
    }
  };

  // Handle address selection from dropdown
  const handleSelectAddress = async (selectedAddress) => {
    // Extract and update address components
    const components = extractAddressComponents(selectedAddress);
    
    setFormData((prev) => ({
      ...prev,
      address: components.address, // Use full address with street number
      city: components.city || prev.city,
      province: components.province || prev.province,
      zipCode: components.zipCode || prev.zipCode,
      latitude: selectedAddress.lat,
      longitude: selectedAddress.lon,
      geocodedAddress: selectedAddress.label,
      geocodedAt: new Date(),
    }));
    
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setGeocodeStatus('success');

    toast({
      title: "Address Located",
      description: "Address coordinates have been set automatically",
      variant: "default",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setShowSuggestions(false);
    try {
      // This route will auto-geocode if address changed
      const response = await fetch(`/api/users/${session.user.id}/geocode`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.user.geocoded) {
          setGeocodeStatus('success');
        }

        toast({
          title: "Success",
          description: data.user.geocoded 
            ? "Profile updated and address geocoded successfully"
            : "Profile updated successfully",
          variant: "default",
        });
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e, field) => {
    setFormData({
      ...formData,
      [field]: e.target.value,
    });
    
    // Clear geocode status if address fields change
    const addressFields = ['address', 'city', 'province', 'zipCode'];
    if (addressFields.includes(field)) {
      setGeocodeStatus(null);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('type', 'avatar');

      const response = await fetch(`/api/users/${session.user.id}/upload-image`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, image: data.url }));
        
        // Update session to reflect new avatar
        await update({
          ...session,
          user: {
            ...session.user,
            image: data.url,
          }
        });

        toast({
          title: "Success",
          description: "Avatar updated successfully",
        });
      } else {
        throw new Error("Failed to upload avatar");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Handle cover image upload
  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Cover image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingCover(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('type', 'cover');

      const response = await fetch(`/api/users/${session.user.id}/upload-image`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, coverImage: data.url }));
        toast({
          title: "Success",
          description: "Cover image updated successfully",
        });
      } else {
        throw new Error("Failed to upload cover image");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload cover image",
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Profile Settings</h2>
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>

      {/* Show skeleton while loading */}
      {isLoadingData ? (
        <SkeletonLoader type="profile" />
      ) : (
        <>
          {/* Geocoding Status Alert */}
          {formData.latitude && formData.longitude && (
            <Alert className={geocodeStatus === 'success' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : ''}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Location Set:</strong> {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    {formData.geocodedAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Last updated: {new Date(formData.geocodedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeocode}
                    disabled={geocoding}
                  >
                    Update Location
                  </Button> */}
                </div>
              </AlertDescription>
            </Alert>
          )}

      {/* Cover Image Upload */}
      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-600">
        {formData.coverImage ? (
          <img
            src={formData.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <ImageIcon className="h-12 w-12 mb-2" />
            <span className="text-sm">Store Cover Image</span>
          </div>
        )}
        <label className="absolute bottom-3 right-3 cursor-pointer">
          <div className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3">
            {uploadingCover ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploadingCover ? 'Uploading...' : 'Change Cover'}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Avatar Upload */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-zinc-600 flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {formData.image || session?.user?.image ? (
              <img
                src={formData.image || session?.user?.image}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <img src="/profile.png" alt="avatar" className="w-24 h-24 rounded-full" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 cursor-pointer">
            <div className="inline-flex items-center justify-center rounded-full p-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange(e, "phone")}
              error={errors.phone}
            />
            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Store Name</label>
            <Input
              value={formData.storename}
              onChange={(e) => handleInputChange(e, "storename")}
              error={errors.storename}
            />
            {errors.storename && <p className="text-sm text-red-500">{errors.storename}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={session?.user?.email} disabled />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Country</label>
          <Input value={formData.country} disabled />
        </div>
            <div>
            <label className="text-sm font-medium">Address</label>
            <div className="relative">
              <Input
                ref={addressInputRef}
                value={formData.address}
                onChange={(e) => handleAddressInput(e.target.value)}
                error={errors.address}
                placeholder="Start typing your address..."
                autoComplete="off"
              />
              
              {/* Address suggestions dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectAddress(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {suggestion.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">City</label>
            <Input
              value={formData.city}
              onChange={(e) => handleInputChange(e, "city")}
              error={errors.city}
            />
            {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Province</label>
            <Select
              value={formData.province}
              onValueChange={(value) =>
                setFormData({ ...formData, province: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gauteng">Gauteng</SelectItem>
                <SelectItem value="Western Cape">Western Cape</SelectItem>
                <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                <SelectItem value="Free State">Free State</SelectItem>
                <SelectItem value="North West">North West</SelectItem>
                <SelectItem value="Limpopo">Limpopo</SelectItem>
              </SelectContent>
            </Select>
            {errors.province && <p className="text-sm text-red-500">{errors.province}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Postal Code</label>
            <Input
              value={formData.zipCode}
              onChange={(e) => handleInputChange(e, "zipCode")}
              error={errors.zipCode}
              maxLength={4}
            />
            {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode}</p>}
          </div>
        </div>

        {/* Automatic Geocoding Info */}
        {geocodeStatus === 'success' && (
          <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm text-emerald-700 dark:text-emerald-300">
              Location has been automatically set from your address. You'll appear on the stores map.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <label className="text-sm font-medium">About</label>
          <Textarea
            value={formData.about}
            onChange={(e) => handleInputChange(e, "about")}
            placeholder="Let customers know more about your store"
            className="h-32"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
        </>
      )}
    </div>
  );
};

export default ProfileDetail;
'use client'
import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Check, MapPin, Upload, X, Image as ImageIcon } from 'lucide-react';
import { searchAddresses, extractAddressComponents } from '@/utils/addressAutocomplete';
import { toast } from '@/components/hooks/use-toast';

const provinces = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Limpopo", "Mpumalanga", "Northern Cape", "North West"
];

export default function OnboardingFlow() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressInputRef = useRef(null);
  const logoInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    storename: session?.user?.name || '',
    phone: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    about: '',
    latitude: null,
    longitude: null,
    geocodedAddress: null,
  });

  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [errors, setErrors] = useState({});

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.storename || formData.storename.length < 3) {
        newErrors.storename = 'Store name must be at least 3 characters';
      }
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      }
    }

    if (step === 2) {
      if (!formData.address) {
        newErrors.address = 'Address is required';
      }
      if (!formData.city) {
        newErrors.city = 'City is required';
      }
      if (!formData.province) {
        newErrors.province = 'Province is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle address input with autocomplete
  const handleAddressInput = async (value) => {
    setFormData(prev => ({ ...prev, address: value, latitude: null, longitude: null }));

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
  const handleSelectAddress = (selectedAddress) => {
    const components = extractAddressComponents(selectedAddress);
    
    setFormData(prev => ({
      ...prev,
      address: components.address,
      city: components.city || prev.city,
      province: components.province || prev.province,
      zipCode: components.zipCode || prev.zipCode,
      latitude: selectedAddress.lat,
      longitude: selectedAddress.lon,
      geocodedAddress: selectedAddress.label,
    }));
    
    setShowSuggestions(false);
    setAddressSuggestions([]);
    
    toast({
      title: "Address Located",
      description: "Your location has been set automatically",
    });
  };

  // Handle logo file selection
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Logo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Remove logo
  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      // Upload logo as user avatar if selected
      let avatarUrl = null;
      if (logoFile) {
        setUploadingLogo(true);
        const logoFormData = new FormData();
        logoFormData.append('image', logoFile);
        logoFormData.append('type', 'avatar');
        
        const logoResponse = await fetch(`/api/users/${session.user.id}/upload-image`, {
          method: 'POST',
          body: logoFormData,
        });
        
        if (logoResponse.ok) {
          const logoData = await logoResponse.json();
          avatarUrl = logoData.url;
        }
        setUploadingLogo(false);
      }

      // Submit profile data with geocoding info
      const submitData = {
        ...formData,
        isOnboarded: true,
        onboardingStep: totalSteps,
        geocodedAt: formData.latitude ? new Date() : null,
      };
      
      if (avatarUrl) {
        submitData.image = avatarUrl;
      }

      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete onboarding');
      }

      // Update session to reflect onboarding status
      await update({
        ...session,
        user: {
          ...session.user,
          isOnboarded: true,
        }
      });
      
      // Force a small delay to ensure session update completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to dashboard with replace to prevent back navigation
      window.location.href = '/dashboard';
      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error);
      setErrors({ submit: error.message || 'Failed to save profile. Please try again.' });
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="pt-3 pb-16 sm:pb-0 sm:pt-12 min-h-dvh overflow-auto bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
      <div className="hidden sm:block fixed inset-0 bg-cover bg-center bg-repeat" style={{backgroundImage: "url('/onboarding.jpeg')"}} />
      <div className="sm:hidden fixed inset-0 bg-cover bg-center bg-no-repeat" style={{backgroundImage: "url('https://plus.unsplash.com/premium_photo-1692444603382-a048297312f5?q=80&w=415&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}} />

      <div className="fixed inset-0 bg-zinc-50/30 dark:bg-black/40" />
      <div className="relative z-10 w-full max-w-6xl px-4">
      <Card className="border-none bg-zinc-300/10 backdrop-blur-md shadow-lg dark:bg-black/40 dark:backdrop-blur-md px-6 py-6 sm:px-10 lg:px-16 lg:py-6 lg:mt-10 max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Welcome! </CardTitle>
              <span className="text-sm font-semibold text-emerald-600 ml-4">Step {currentStep} of {totalSteps}</span>
          </div>
          <CardTitle className="text-2xl">Let's Set Up Your Store</CardTitle>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in-50">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storename">Store Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="storename"
                      value={formData.storename}
                      onChange={(e) => handleChange('storename', e.target.value)}
                      placeholder="My Awesome Store"
                      className={`bg-white/35 dark:bg-black/40 ${errors.storename ? 'border-red-500' : ''}`}
                    />
                    {errors.storename && (
                      <p className="text-sm text-red-500 mt-1">{errors.storename}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      This is how customers will find you
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="0123456789"
                      className={`bg-white/35 dark:bg-black/40 ${errors.phone ? 'border-red-500' : ''}` }
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in-50">
              <h3 className="text-lg font-semibold mb-4">Location Details</h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="address">Street Address <span className="text-red-500">*</span></Label>
                  <Input
                    ref={addressInputRef}
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    placeholder="Start typing your address..."
                    autoComplete="off"
                    className={`bg-white/35 dark:bg-black/40 ${errors.address ? 'border-red-500' : ''}`}
                  />
                  
                  {/* Address suggestions dropdown */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectAddress(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                              {suggestion.label}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {errors.address && (
                    <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                  )}
                  
                  {formData.latitude && (
                    <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Location set automatically
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Johannesburg"
                      className={`bg-white/35 dark:bg-black/40 ${errors.city ? 'border-red-500' : ''}`}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="zipCode">Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleChange('zipCode', e.target.value)}
                      placeholder="2000"
                      className="bg-white/35 dark:bg-black/40"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="province">Province <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.province}
                    onValueChange={(value) => handleChange('province', value)}
                  >
                    <SelectTrigger className={`bg-white/35 dark:bg-black/40 ${errors.province ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent className="border-none ">
                      {provinces.map((prov) => (
                        <SelectItem className="cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-600" key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.province && (
                    <p className="text-sm text-red-500 mt-1">{errors.province}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: About & Finish */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50">
              <h3 className="text-lg font-semibold mb-4">Tell Us About Your Store</h3>
              
              {/* Logo Upload */}
              <div>
                <Label>Store Logo (Optional)</Label>
                <div className="mt-2">
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-full cursor-pointer hover:border-emerald-500 transition-colors bg-white/35 dark:bg-black/40">
                      <ImageIcon className="h-8 w-8 text-zinc-400" />
                      <span className="text-xs text-zinc-500 mt-1">Upload</span>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This will be displayed on your store page
                </p>
              </div>

              <div>
                <Label htmlFor="about">About Your Store (Optional)</Label>
                <Textarea
                  id="about"
                  value={formData.about}
                  onChange={(e) => handleChange('about', e.target.value)}
                  placeholder="Share what makes your store special..."
                  className="h-32 resize-none bg-white/35 dark:bg-black/40"
                  maxLength={500}
                />
                <p className="text-sm text-zinc-600 mt-1">
                  {formData.about.length}/500 characters
                </p>
              </div>

              {errors.submit && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                  {errors.submit}
                </div>
              )}

              {/* <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-md">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900 dark:text-emerald-100">
                      You're all set!
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                      Click finish to start selling on the platform
                    </p>
                  </div>
                </div>
              </div> */}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading || uploadingLogo}
                variant='success'
              >
                {loading ? (uploadingLogo ? 'Uploading logo...' : 'Saving...') : 'Finish & Start Selling'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Clock, Navigation, Mic, Keyboard } from 'lucide-react';
import DateTimePicker from '@/components/shared/DateTimePicker';
import VoiceRecorder from './VoiceRecorder';
import ImageUpload from './ImageUpload';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';
import { z } from 'zod';

const jobSchema = z.object({
  categoryId: z.string().min(1, 'Please select a service category'),
  details: z.string().trim().min(10, 'Please provide at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  street: z.string().trim().min(1, 'Street address is required').max(200),
  apt: z.string().trim().max(50).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  zipCode: z.string().trim().min(1, 'ZIP code is required').max(20),
  latitude: z.number(),
  longitude: z.number(),
});

type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parent_id?: string;
};

const CreateJobView = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    categoryId: '',
    details: '',
    slotStart: new Date(),
    slotEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
    street: '',
    apt: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: 0,
    longitude: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .not('parent_id', 'is', null)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error loading categories',
        description: error.message,
      });
    }
  };

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast({
        variant: 'destructive',
        title: 'Location not supported',
        description: 'Your browser does not support geolocation',
      });
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Try to reverse geocode using OpenStreetMap's Nominatim API (free, no API key needed)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'TaskApp/1.0'
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.address;
            
            // Extract address components
            const street = [
              address.house_number,
              address.road || address.street
            ].filter(Boolean).join(' ');
            
            const city = address.city || address.town || address.village || address.municipality || '';
            const state = address.state || '';
            const zipCode = address.postcode || '';
            
            setFormData(prev => ({
              ...prev,
              street: street.trim(),
              city,
              state,
              zipCode,
              latitude: lat,
              longitude: lng,
            }));
            
            setGettingLocation(false);
            toast({
              title: 'Location set',
              description: `Address: ${street.trim()}, ${city}, ${state} ${zipCode}`,
            });
          } else {
            throw new Error('Geocoding failed');
          }
        } catch (error) {
          console.error('Error geocoding:', error);
          // If geocoding fails, just set coordinates
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
          setGettingLocation(false);
          toast({
            title: 'Location captured',
            description: 'Coordinates set. Please enter your address manually.',
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
        toast({
          variant: 'destructive',
          title: 'Location error',
          description: 'Could not get your location. Please enable location permissions and try again.',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    const validation = jobSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof typeof formData, string>> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof typeof formData] = err.message;
        }
      });
      setErrors(fieldErrors);
      
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Please fix the errors in the form',
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('job-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user?.id,
          category_id: formData.categoryId,
          details: formData.details,
          slot_start: formData.slotStart.toISOString(),
          slot_end: formData.slotEnd.toISOString(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          image_url: imageUrl,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Task created!',
        description: 'Your task has been saved. You can now choose how to proceed.',
      });

      // Pass address data via navigation state
      navigate(`/app/user/jobs/${data.id}`, {
        state: {
          address: {
            street: formData.street,
            apt: formData.apt,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          }
        }
      });
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        variant: 'destructive',
        title: 'Error creating job',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleMapsLoader>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Describe Your Task</h1>
          <p className="text-muted-foreground">Tell us about the issue or task you want to accomplish</p>
        </div>

        <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>Describe your issue or the task you want to achieve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Service Type *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon && `${cat.icon} `}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId}</p>}
            </div>

            {/* Input Method Selection */}
            <div className="space-y-4">
              <Label>How would you like to describe your task?</Label>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'text' | 'voice')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="gap-2">
                    <Keyboard className="w-4 h-4" />
                    Text Input
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="gap-2">
                    <Mic className="w-4 h-4" />
                    Voice Input
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="space-y-2 mt-4">
                  <Textarea
                    id="details"
                    placeholder="Describe the issue you're facing or the task you want to accomplish. Include any relevant details that will help us understand your needs..."
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    rows={5}
                    maxLength={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{errors.details || 'Minimum 10 characters'}</span>
                    <span>{formData.details.length}/1000</span>
                  </div>
                </TabsContent>
                
                <TabsContent value="voice" className="space-y-4 mt-4">
                  <VoiceRecorder
                    onTranscription={(text) => setFormData({ ...formData, details: text })}
                  />
                  {formData.details && (
                    <div className="p-4 border rounded-md bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Transcribed text:</p>
                      <p className="text-sm">{formData.details}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Image Upload */}
            <ImageUpload
              onImageSelect={(file, preview) => {
                setImageFile(file);
                setImagePreview(preview);
              }}
              onImageRemove={() => {
                setImageFile(null);
                setImagePreview('');
              }}
              imagePreview={imagePreview}
            />

            {/* Location Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Service Location *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {gettingLocation ? 'Getting location...' : 'Use Current Location'}
                </Button>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    placeholder="123 Main Street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    maxLength={200}
                  />
                  {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apt">Apartment / Unit (Optional)</Label>
                  <Input
                    id="apt"
                    placeholder="Apt 4B, Suite 100, etc."
                    value={formData.apt}
                    onChange={(e) => setFormData({ ...formData, apt: e.target.value })}
                    maxLength={50}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      maxLength={100}
                    />
                    {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      maxLength={100}
                    />
                    {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    placeholder="10001"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    maxLength={20}
                  />
                  {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode}</p>}
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>
                <Clock className="w-4 h-4 inline mr-2" />
                When do you need the service? *
              </Label>
              <DateTimePicker
                startDate={formData.slotStart}
                endDate={formData.slotEnd}
                onStartChange={(date) => setFormData({ ...formData, slotStart: date })}
                onEndChange={(date) => setFormData({ ...formData, slotEnd: date })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/app/user')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
    </GoogleMapsLoader>
  );
};

export default CreateJobView;

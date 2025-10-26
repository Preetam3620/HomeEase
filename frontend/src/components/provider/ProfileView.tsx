import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Category, ProviderProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LocationPicker from '@/components/shared/LocationPicker';

const ProfileView = () => {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCategories();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*, categories(*)')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setBio(data.bio || '');
        setLocation({ lat: data.latitude, lng: data.longitude });
        setSelectedCategories(data.categories?.map((c: Category) => c.id) || []);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading profile',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const profileData = {
        user_id: user?.id,
        bio,
        latitude: location.lat,
        longitude: location.lng,
      };

      let profileId = profile?.id;

      if (!profile) {
        const { data, error } = await supabase
          .from('provider_profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) throw error;
        profileId = data.id;
      } else {
        const { error } = await supabase
          .from('provider_profiles')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
      }

      // Update categories
      await supabase
        .from('provider_categories')
        .delete()
        .eq('provider_id', profileId);

      if (selectedCategories.length > 0) {
        const { error } = await supabase
          .from('provider_categories')
          .insert(
            selectedCategories.map(catId => ({
              provider_id: profileId,
              category_id: catId,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: 'Profile updated',
        description: 'Your provider profile has been saved',
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving profile',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Provider Profile</h1>
        <p className="text-muted-foreground">Manage your professional profile</p>
      </div>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-5 h-5 fill-warning text-warning" />
                  <span className="text-2xl font-bold">{profile.ratingAvg.toFixed(1)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.ratingCount} reviews
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Professional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell customers about your experience and expertise..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Service Categories</Label>
            <div className="grid md:grid-cols-2 gap-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2 border rounded-lg p-3">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label htmlFor={category.id} className="cursor-pointer flex-1">
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              <MapPin className="w-4 h-4 inline mr-2" />
              Service Location
            </Label>
            <LocationPicker
              initialLocation={profile ? { lat: profile.latitude, lng: profile.longitude } : undefined}
              onLocationSelect={setLocation}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileView;

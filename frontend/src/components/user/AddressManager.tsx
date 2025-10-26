import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Loader2, Edit, Trash2, MapPin, Save, X } from 'lucide-react';
import { z } from 'zod';
import LocationPicker from '@/components/shared/LocationPicker';

const addressSchema = z.object({
  label: z.string().trim().max(50, 'Label must be less than 50 characters').optional(),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200, 'Address must be less than 200 characters'),
  line2: z.string().trim().max(200, 'Address must be less than 200 characters').optional(),
  city: z.string().trim().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
  state: z.string().trim().min(1, 'State is required').max(100, 'State must be less than 100 characters'),
  pincode: z.string().trim().min(1, 'Pincode is required').max(20, 'Pincode must be less than 20 characters'),
  country: z.string().trim().min(1, 'Country is required').max(100, 'Country must be less than 100 characters'),
  latitude: z.number(),
  longitude: z.number(),
});

type Address = {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
};

type AddressFormData = Omit<Address, 'id' | 'is_default'>;

const AddressManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'US',
    latitude: 0,
    longitude: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load addresses',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'US',
      latitude: 0,
      longitude: 0,
    });
    setErrors({});
    setEditingId(null);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      label: address.label || '',
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setEditingId(address.id);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Address deleted',
        description: 'Address has been removed',
      });
      fetchAddresses();
    } catch (error: any) {
      console.error('Error deleting address:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete address',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const validation = addressSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof AddressFormData, string>> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof AddressFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const addressData = {
        ...formData,
        user_id: user?.id,
        line2: formData.line2 || null,
        label: formData.label || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('addresses')
          .update(addressData)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Address updated', description: 'Your address has been updated' });
      } else {
        const { error } = await supabase.from('addresses').insert(addressData);
        if (error) throw error;
        toast({ title: 'Address added', description: 'New address has been added' });
      }

      setShowDialog(false);
      resetForm();
      fetchAddresses();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save address',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    setFormData({
      ...formData,
      line1: location.address,
      latitude: location.lat,
      longitude: location.lng,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Saved Addresses</h2>
          <p className="text-muted-foreground">Manage your delivery addresses</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No addresses saved</h3>
          <p className="text-muted-foreground mb-6">Add your first address to get started</p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            Add Address
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {address.label && (
                        <CardTitle className="text-lg">{address.label}</CardTitle>
                      )}
                      {address.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {address.line1}
                      {address.line2 && `, ${address.line2}`}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                      <br />
                      {address.country}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(address)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(address.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update your address details' : 'Enter your address details'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label (Optional)</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Home, Office"
                maxLength={50}
              />
              {errors.label && <p className="text-sm text-destructive">{errors.label}</p>}
            </div>

            <div className="space-y-2">
              <Label>Search Location</Label>
              <LocationPicker onLocationSelect={handleLocationSelect} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="line1">Address Line 1 *</Label>
              <Input
                id="line1"
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                placeholder="Street address"
                maxLength={200}
              />
              {errors.line1 && <p className="text-sm text-destructive">{errors.line1}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="line2">Address Line 2</Label>
              <Input
                id="line2"
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                placeholder="Apartment, suite, etc. (optional)"
                maxLength={200}
              />
              {errors.line2 && <p className="text-sm text-destructive">{errors.line2}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  maxLength={100}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  maxLength={100}
                />
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="Pincode"
                  maxLength={20}
                />
                {errors.pincode && <p className="text-sm text-destructive">{errors.pincode}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                  maxLength={100}
                />
                {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update' : 'Add'} Address
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressManager;

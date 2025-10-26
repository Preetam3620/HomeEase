import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: { lat: number; lng: number }) => void;
}

const LocationPicker = ({ initialLocation, onLocationSelect }: LocationPickerProps) => {
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(initialLocation || { lat: 0, lng: 0 });

  useEffect(() => {
    if ('geolocation' in navigator && !initialLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(newLocation);
          onLocationSelect(newLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const handleAddressChange = async (value: string) => {
    setAddress(value);
    
    // Use browser geocoding API if available
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: value }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const newLocation = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          setLocation(newLocation);
          onLocationSelect(newLocation);
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter your address..."
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <GoogleMapsLoader>
        <div className="w-full h-64 rounded-lg overflow-hidden border">
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      </GoogleMapsLoader>
    </div>
  );
};

export default LocationPicker;

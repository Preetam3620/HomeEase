import { useJsApiLoader } from '@react-google-maps/api';
import { ReactNode } from 'react';

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

interface GoogleMapsLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const GoogleMapsLoader = ({ children, fallback }: GoogleMapsLoaderProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (loadError) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        Error loading Google Maps. Please check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return <>{fallback || <div className="animate-pulse bg-muted h-96 rounded-lg" />}</>;
  }

  return <>{children}</>;
};

export default GoogleMapsLoader;

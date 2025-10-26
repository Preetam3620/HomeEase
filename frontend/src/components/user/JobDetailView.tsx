import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Calendar, DollarSign, User, Star, Wrench, Users, Edit, X, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import DispatchProgress from '@/components/shared/DispatchProgress';
import ReviewForm from '@/components/shared/ReviewForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NearbyStore {
  name: string;
  address: string;
  distance: string;
  rating: string;
  google_maps: string;
}

interface DIYApiResponse {
  title: string;
  steps: string[];
  assumptions: string[];
  tips: string[];
  tools: string[];
  products: string[];
}

interface AddressData {
  street: string;
  apt?: string;
  city: string;
  state: string;
  zipCode: string;
}

interface LocationState {
  address?: AddressData;
}

interface Product {
  title: string;
  url: string;
  image: string;
  price: string;
  rating: number;
  review_count: number;
  asin: string;
  availability: string;
}

// Hardcoded product recommendations
const PRODUCT_RECOMMENDATIONS: Record<string, Product[]> = {
  'plumbing': [
    {
      title: "Beer Faucet Wrench for Draft beerTap",
      url: "https://www.amazon.com/Faucet-beerTap-Spanner-Kegerator-Brewing/dp/B0FK9TBP5D",
      image: "https://m.media-amazon.com/images/I/61SVNnddK9L._AC_SX679_.jpg",
      price: "$8.99",
      rating: 4.5,
      review_count: 1234,
      asin: "B0FK9TBP5D",
      availability: "In Stock"
    },
    {
      title: "Multi-Bit Screwdriver/Nut Driver",
      url: "https://www.amazon.com/Amazon-Brand-6-Multi-Bit-Screwdriver/dp/B09G7J1X2N/",
      image: "https://m.media-amazon.com/images/I/614Zv7I+SFL._AC_SX679_.jpg",
      price: "$7.18",
      rating: 4.6,
      review_count: 1234,
      asin: "B09G7J1X2N",
      availability: "In Stock"
    },
    {
      title: "Lighting EVER LED Flashlights High Lumens, Small Flashlight",
      url: "https://www.amazon.com/Adjustable-Tactical-Flashlight-Zoomable-Batteries/dp/B005FEGYCO",
      image: "https://m.media-amazon.com/images/I/71Sssq9cWcL._AC_SX679_.jpg",
      price: "$7.99",
      rating: 4.6,
      review_count: 1234,
      asin: "B005FEGYCO",
      availability: "In Stock"
    }
  ],
  'carpentry': [
    {
      title: "Massca Twin Pocket Hole Jig Kit",
      url: "https://www.amazon.com/Massca-Twin-Pocket-Hole-Jig/dp/B07C29KXNT/",
      image: "https://m.media-amazon.com/images/I/71YEb2e2jgL._AC_SX679_.jpg",
      price: "$132.50",
      rating: 4.3,
      review_count: 856,
      asin: "B07C29KXNT",
      availability: "In Stock"
    }
  ],
  'home-decor': [
    {
      title: "Amazon Basics Wood Floating Wall Shelves",
      url: "https://www.amazon.com/Amazon-Basics-Wood-Floating-Shelves/dp/B0DKSLZ29R",
      image: "https://m.media-amazon.com/images/I/61+uFRKnB9L._AC_SX679_.jpg",
      price: "$28.33",
      rating: 4.7,
      review_count: 2341,
      asin: "B0DKSLZ29R",
      availability: "In Stock"
    },
  ]
};

const JobDetailView = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editedDetails, setEditedDetails] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [diyApiResponse, setDiyApiResponse] = useState<DIYApiResponse | null>(null);
  const [diyPlan, setDiyPlan] = useState<{
    steps: string[];
    toolsAndMaterials: Array<{
      name: string;
      estimatedCost: string;
      quantity: string;
      storeType: string;
    }>;
  } | null>(null);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchJob = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          category:categories(id, name, slug),
          provider:provider_profiles(
            id,
            user_id,
            rating_avg,
            rating_count
          ),
          payment:payments(*),
          reviews(*)
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;

      // Fetch provider profile name if provider exists
      if (data?.provider?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', data.provider.user_id)
          .single();

        const mappedJob = {
          id: data.id,
          userId: data.user_id,
          providerId: data.provider_id,
          categoryId: data.category_id,
          category: data.category,
          details: data.details,
          slotStart: data.slot_start,
          slotEnd: data.slot_end,
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status,
          dispatchOrder: data.dispatch_order,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          provider: {
            ...data.provider,
            ratingAvg: data.provider.rating_avg,
            ratingCount: data.provider.rating_count,
            user: {
              name: profile?.name
            }
          },
          payment: data.payment,
          reviews: data.reviews
        };

        setJob(mappedJob);
        setEditedDetails(data.details);
      } else {
        const mappedJob = {
          id: data.id,
          userId: data.user_id,
          providerId: data.provider_id,
          categoryId: data.category_id,
          category: data.category,
          details: data.details,
          slotStart: data.slot_start,
          slotEnd: data.slot_end,
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status,
          dispatchOrder: data.dispatch_order,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          provider: data.provider,
          payment: data.payment,
          reviews: data.reviews
        };
        setJob(mappedJob);
        setEditedDetails(data.details);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error loading task',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  }, [jobId, toast]);

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId, fetchJob]);


  const handleDIY = async () => {
    try {
      setGeneratingPlan(true);

      // Call Supabase edge function to generate DIY plan
      const { data, error } = await supabase.functions.invoke('generate-diy-plan', {
        body: {
          taskDetails: job?.details || '',
          category: job?.category?.slug || 'general'
        }
      });

      if (error) throw error;
      if (!data?.plan) throw new Error('No plan generated');

      console.log('✅ DIY Plan generated:', data.plan);

      // Map the response to the expected format
      const tutorialData = {
        title: `DIY Guide for ${job?.category?.name || 'Task'}`,
        steps: data.plan.steps || [],
        assumptions: [],
        tips: [],
        tools: data.plan.toolsAndMaterials?.map((item: any) => item.name) || [],
        products: []
      };

      // Store the tutorial API response
      setDiyApiResponse(tutorialData);

      // Create DIY plan data
      const diyPlanData = {
        steps: data.plan.steps || [],
        toolsAndMaterials: data.plan.toolsAndMaterials || []
      };
      setDiyPlan(diyPlanData);

      // Save DIY data to localStorage so it persists when user navigates away
      localStorage.setItem(`diy-plan-${jobId}`, JSON.stringify({
        diyApiResponse: tutorialData,
        diyPlan: diyPlanData,
        nearbyStores: []
      }));

      // Update job status to COMPLETED
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'COMPLETED' })
        .eq('id', jobId);

      if (updateError) throw updateError;

      toast({
        title: 'DIY Plan generated!',
        description: 'Your personalized DIY guide is ready.',
      });

      setGeneratingPlan(false);
      fetchJob();
    } catch (error) {
      setGeneratingPlan(false);
      console.error('❌ API Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate DIY plan',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Task deleted',
        description: 'Your task has been removed.',
      });

      navigate('/app/user');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleProceedToDispatch = () => {
    setShowReviewModal(true);
  };

  const handleConfirmDispatch = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'DISPATCHING',
          details: editedDetails 
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Finding providers',
        description: 'Searching for the best service providers for you...',
      });

      setShowReviewModal(false);
      fetchJob();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleCancelDispatch = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'DRAFT' })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Dispatch canceled',
        description: 'Your task has been moved back to draft.',
      });

      fetchJob();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ details: editedDetails })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Task updated',
        description: 'Your task details have been saved.',
      });

      setIsEditing(false);
      fetchJob();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'COMPLETED' })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Task marked as complete',
        description: 'Please leave a review for the provider',
      });

      fetchJob();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  if (!job) {
    return <div className="text-center py-12">Task not found</div>;
  }

  // Show DIY plan generation screen
  if (generatingPlan) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-primary">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="absolute inset-0 animate-ping opacity-20">
                  <Loader2 className="w-16 h-16 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Generating Your DIY Plan</h2>
                <p className="text-muted-foreground">
                  We're creating step-by-step instructions for you...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show DIY plan after generation
  if (diyPlan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/user')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="border-primary">
          <CardHeader>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Title and Tips */}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-6 h-6" />
                  {diyApiResponse?.title || 'Your DIY Plan'}
                </CardTitle>
                {diyApiResponse?.tips && diyApiResponse.tips.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold">Tips:</h4>
                    <ul className="space-y-1">
                      {diyApiResponse.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right: Reference Image (Home Decor only) */}
              {job?.category?.slug === 'home-decor' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Imagine your space transformed like this</h3>
                  <img
                    src="/images/home-decor-reference.jpg"
                    alt="Home Decor Reference"
                    className="w-full rounded-lg shadow-md object-cover"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="border-t pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Steps */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Step-by-Step Instructions</h3>
                <ol className="space-y-3">
                  {diyPlan.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="font-semibold text-primary min-w-[2rem]">{index + 1}.</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Right Column: Tools & Products */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Tools & Materials</h3>
                <div className="space-y-4">
                  {diyApiResponse?.tools && diyApiResponse.tools.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Tools:</h4>
                      <ul className="space-y-2">
                        {diyApiResponse.tools.map((tool, index) => (
                          <li key={index} className="flex gap-2 items-start p-2 bg-muted rounded-lg">
                            <span className="text-primary">✓</span>
                            <span className="text-sm">{tool}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diyApiResponse?.products && diyApiResponse.products.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Products:</h4>
                      <ul className="space-y-2">
                        {diyApiResponse.products.map((product, index) => (
                          <li key={index} className="flex gap-2 items-start p-2 bg-muted rounded-lg">
                            <span className="text-primary">✓</span>
                            <span className="text-sm">{product}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Keep the old Tools & Materials section for backward compatibility if needed */}
            <div className="hidden">
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Tools & Materials Needed</h3>
                <div className="space-y-3">
                  {diyPlan.toolsAndMaterials.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} • Store Type: {item.storeType}
                        </p>
                      </div>
                      <p className="font-semibold text-primary">{item.estimatedCost}</p>
                    </div>
                  ))}
                  <div className="pt-3 border-t bg-primary/5 p-3 rounded-lg">
                    <p className="text-lg font-semibold">
                      Total Estimated Cost: ${diyPlan.toolsAndMaterials.reduce((sum, item) => {
                        const cost = item.estimatedCost.match(/\d+/)?.[0] || '0';
                        return sum + parseInt(cost);
                      }, 0)} - ${diyPlan.toolsAndMaterials.reduce((sum, item) => {
                        const costs = item.estimatedCost.match(/\d+/g) || ['0'];
                        return sum + parseInt(costs[costs.length - 1]);
                      }, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {nearbyStores.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-3">Nearby Hardware Stores</h3>
                <div className="space-y-3">
                  {nearbyStores.map((store, index) => (
                    <div key={index} className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{store.name}</p>
                          <p className="text-sm text-muted-foreground">{store.address}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-warning text-warning" />
                          <span className="font-medium">{store.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">📍 {store.distance}</span>
                        <a
                          href={store.google_maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View on Google Maps →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Recommendations */}
            {job?.category?.slug && PRODUCT_RECOMMENDATIONS[job.category.slug] && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-3">Recommended Products</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {PRODUCT_RECOMMENDATIONS[job.category.slug].map((product, index) => (
                    <a
                      key={index}
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors block"
                    >
                      <div className="flex gap-4">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-24 h-24 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm line-clamp-2 mb-2">{product.title}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-warning text-warning" />
                              <span className="text-sm font-medium">{product.rating}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">({product.review_count.toLocaleString()})</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">{product.price}</span>
                            <span className="text-xs text-green-600 font-medium">{product.availability}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={() => navigate('/app/user')} size="lg">
            Done
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: 'secondary',
      DISPATCHING: 'default',
      OFFERED: 'default',
      ACCEPTED: 'default',
      SCHEDULED: 'default',
      IN_PROGRESS: 'default',
      COMPLETED: 'default',
      PAID: 'default',
      CANCELED: 'destructive',
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/app/user')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{job.category?.name}</h1>
          <Badge variant={getStatusColor(job.status)} className="text-sm">
            {job.status.replace('_', ' ')}
          </Badge>
        </div>
        {(job.status === 'DRAFT' || job.status === 'DISPATCHING') && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {/* DIY vs Service Provider Selection - Only show for DRAFT status */}
      {job.status === 'DRAFT' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary" onClick={handleDIY}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">DIY</CardTitle>
              <CardDescription>I'll do it myself</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Handle this task on your own without professional help
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary" onClick={handleProceedToDispatch}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Get Help</CardTitle>
              <CardDescription>I want a service provider</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Connect with qualified professionals to help with your task
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task Details</CardTitle>
            {(job.status === 'DRAFT' || job.status === 'DISPATCHING') && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedDetails}
                  onChange={(e) => setEditedDetails(e.target.value)}
                  rows={5}
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} size="sm">Save</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditing(false);
                    setEditedDetails(job.details);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{job.details}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </h4>
              <p className="text-sm text-muted-foreground">
                Start: {format(new Date(job.slotStart), 'MMM d, yyyy h:mm a')}
              </p>
              <p className="text-sm text-muted-foreground">
                End: {format(new Date(job.slotEnd), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {job.payment && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment
                </h4>
                <p className="text-2xl font-bold">
                  ${(job.payment.amountCents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {job.payment.status}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel/Edit buttons for DISPATCHING status */}
      {job.status === 'DISPATCHING' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleCancelDispatch} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancel Dispatch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {job.provider && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{job.provider.user?.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  {job.provider.ratingAvg.toFixed(1)} ({job.provider.ratingCount} reviews)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {job.status === 'DISPATCHING' && <DispatchProgress jobId={job.id} />}

      {job.status === 'IN_PROGRESS' && (
        <div className="flex justify-center">
          <Button onClick={handleComplete} size="lg">
            Mark Task as Complete
          </Button>
        </div>
      )}

      {job.status === 'COMPLETED' && !job.reviews?.length && (
        <ReviewForm jobId={job.id} providerId={job.providerId!} onReviewSubmit={fetchJob} />
      )}

      {job.reviews && job.reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < job.reviews![0].rating
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <p className="text-muted-foreground">{job.reviews[0].comment}</p>
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Review Your Task Details</CardTitle>
              <CardDescription>Please review and edit if needed before dispatching to providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Task Description</h4>
                <Textarea
                  value={editedDetails}
                  onChange={(e) => setEditedDetails(e.target.value)}
                  rows={5}
                  maxLength={1000}
                />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Category</h4>
                <p className="text-muted-foreground">{job.category?.name}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Schedule</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(job.slotStart), 'MMM d, yyyy h:mm a')} - {format(new Date(job.slotEnd), 'h:mm a')}
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowReviewModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmDispatch} className="flex-1">
                  Confirm & Dispatch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobDetailView;
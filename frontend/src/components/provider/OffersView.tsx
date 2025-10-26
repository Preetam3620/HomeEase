import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const OffersView = () => {
  const [offers, setOffers] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchOffers();
      subscribeToOffers();
    }
  }, [user]);

  const fetchOffers = async () => {
    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Fetch all DISPATCHING jobs
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq('status', 'DISPATCHING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user names for each job
      const jobsWithUserNames = await Promise.all(
        (data || []).map(async (job: any) => {
          if (job.user_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', job.user_id)
              .single();

            return {
              id: job.id,
              userId: job.user_id,
              categoryId: job.category_id,
              category: job.category,
              details: job.details,
              slotStart: job.slot_start,
              slotEnd: job.slot_end,
              latitude: job.latitude,
              longitude: job.longitude,
              status: job.status,
              createdAt: job.created_at,
              updatedAt: job.updated_at,
              user: {
                name: userProfile?.name || 'Unknown User'
              }
            };
          }
          return job;
        })
      );

      setOffers(jobsWithUserNames);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading offers',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOffers = () => {
    const subscription = supabase
      .channel('jobs_dispatching')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleResponse = async (jobId: string, outcome: 'ACCEPTED' | 'REJECTED') => {
    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Provider profile not found');

      // If accepted, update job status and assign provider
      if (outcome === 'ACCEPTED') {
        const { error: jobError } = await supabase
          .from('jobs')
          .update({
            status: 'ACCEPTED',
            provider_id: profile.id,
          })
          .eq('id', jobId)
          .eq('status', 'DISPATCHING'); // Only update if still dispatching

        if (jobError) throw jobError;

        // Create or update dispatch attempt
        await supabase
          .from('dispatch_attempts')
          .upsert({
            job_id: jobId,
            provider_id: profile.id,
            outcome: 'ACCEPTED',
            responded_at: new Date().toISOString(),
            rank: 1
          });
      }

      toast({
        title: outcome === 'ACCEPTED' ? 'Offer accepted!' : 'Offer declined',
        description: outcome === 'ACCEPTED' 
          ? 'The job has been added to your schedule'
          : 'Looking for more opportunities...',
      });

      fetchOffers();
    } catch (error: any) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Job Offers</h1>
        <p className="text-muted-foreground">Review and respond to job opportunities</p>
      </div>

      {offers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No pending offers</h3>
          <p className="text-muted-foreground">
            New job opportunities will appear here when available
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-lg transition-all border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {offer.category?.name || 'Service Request'}
                      </CardTitle>
                      <Badge variant="secondary">New</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer: {offer.user?.name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Job Details</h4>
                  <p className="text-muted-foreground">{offer.details}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {offer.slotStart && format(new Date(offer.slotStart), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Duration: {offer.slotStart && offer.slotEnd && 
                      `${Math.round((new Date(offer.slotEnd).getTime() - new Date(offer.slotStart).getTime()) / (1000 * 60 * 60))} hours`
                    }
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Posted {format(new Date(offer.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleResponse(offer.id, 'REJECTED')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-accent"
                    onClick={() => handleResponse(offer.id, 'ACCEPTED')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OffersView;

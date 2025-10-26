import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const JobsView = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          category:categories(id, name, slug),
          provider:provider_profiles(id, user_id)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch provider names separately if provider exists
      const jobsWithProviderNames = await Promise.all(
        (data || []).map(async (job: any) => {
          if (job.provider?.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', job.provider.user_id)
              .single();
            
            return {
              id: job.id,
              userId: job.user_id,
              providerId: job.provider_id,
              categoryId: job.category_id,
              category: job.category,
              details: job.details,
              slotStart: job.slot_start,
              slotEnd: job.slot_end,
              latitude: job.latitude,
              longitude: job.longitude,
              status: job.status,
              dispatchOrder: job.dispatch_order,
              createdAt: job.created_at,
              updatedAt: job.updated_at,
              provider: {
                ...job.provider,
                name: profile?.name
              }
            };
          }
          return {
            id: job.id,
            userId: job.user_id,
            providerId: job.provider_id,
            categoryId: job.category_id,
            category: job.category,
            details: job.details,
            slotStart: job.slot_start,
            slotEnd: job.slot_end,
            latitude: job.latitude,
            longitude: job.longitude,
            status: job.status,
            dispatchOrder: job.dispatch_order,
            createdAt: job.created_at,
            updatedAt: job.updated_at,
            provider: job.provider
          };
        })
      );

      setJobs(jobsWithProviderNames);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading jobs',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'secondary',
      DISPATCHING: 'warning',
      OFFERED: 'info',
      ACCEPTED: 'success',
      SCHEDULED: 'success',
      IN_PROGRESS: 'primary',
      COMPLETED: 'success',
      PAID: 'success',
      CANCELED: 'destructive',
    };
    return colors[status] || 'secondary';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">Manage your service requests</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/user/create')} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first job to get started with HomeEase
          </p>
          <Button onClick={() => navigate('/app/user/create')}>
            Create Your First Job
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/app/user/jobs/${job.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{job.category?.name}</CardTitle>
                      <Badge variant={getStatusColor(job.status) as any}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.details}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(job.slotStart), 'MMM d, yyyy h:mm a')}
                  </div>
                  {job.payment && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${(job.payment.amountCents / 100).toFixed(2)}
                    </div>
                  )}
                  {job.provider?.name && (
                    <div className="flex items-center gap-1">
                      Provider: {job.provider.name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobsView;

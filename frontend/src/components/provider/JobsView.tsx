import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const JobsView = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          category:categories(id, name, slug),
          payment:payments(*)
        `)
        .eq('provider_id', profile.id)
        .in('status', ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
        .order('slot_start', { ascending: true });

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
              payment: job.payment,
              user: {
                name: userProfile?.name || 'Unknown User'
              }
            };
          }
          return job;
        })
      );

      setJobs(jobsWithUserNames);
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

  const handleUpdateStatus = async (jobId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Job marked as ${status.toLowerCase().replace('_', ' ')}`,
      });

      fetchJobs();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACCEPTED: 'success',
      SCHEDULED: 'success',
      IN_PROGRESS: 'primary',
      COMPLETED: 'success',
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
      <div>
        <h1 className="text-3xl font-bold mb-2">My Jobs</h1>
        <p className="text-muted-foreground">Manage your accepted jobs</p>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No active jobs</h3>
          <p className="text-muted-foreground">
            Accept job offers to see them here
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{job.category?.name}</CardTitle>
                      <Badge variant={getStatusColor(job.status) as any}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer: {job.user?.name}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{job.details}</p>
                
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
                </div>

                <div className="flex gap-3 pt-2">
                  {job.status === 'ACCEPTED' && (
                    <Button
                      onClick={() => handleUpdateStatus(job.id, 'IN_PROGRESS')}
                      className="flex-1"
                    >
                      Start Job
                    </Button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <Button
                      onClick={() => handleUpdateStatus(job.id, 'COMPLETED')}
                      className="flex-1"
                    >
                      Mark Complete
                    </Button>
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

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, CheckCircle } from 'lucide-react';

interface DispatchProgressProps {
  jobId: string;
}

const DispatchProgress = ({ jobId }: DispatchProgressProps) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
    const subscription = subscribeToAttempts();
    return () => {
      subscription.unsubscribe();
    };
  }, [jobId]);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('dispatch_attempts')
        .select(`
          *,
          provider:provider_profiles(
            id,
            user_id,
            users(name)
          )
        `)
        .eq('job_id', jobId)
        .order('rank');

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAttempts = () => {
    return supabase
      .channel(`dispatch_attempts_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_attempts',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          fetchAttempts();
        }
      )
      .subscribe();
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      ACCEPTED: 'success',
      REJECTED: 'destructive',
      IGNORED: 'secondary',
      EXPIRED: 'secondary',
    };
    return colors[outcome] || 'secondary';
  };

  const acceptedAttempt = attempts.find(a => a.outcome === 'ACCEPTED');
  const progress = attempts.length > 0 ? (attempts.filter(a => a.outcome).length / attempts.length) * 100 : 0;

  if (loading) {
    return <div className="animate-pulse">
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-muted rounded"></div>
        </CardContent>
      </Card>
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dispatch Progress
          </CardTitle>
          {acceptedAttempt && (
            <Badge className="bg-success text-success-foreground">
              <CheckCircle className="w-3 h-3 mr-1" />
              Accepted
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {attempts.filter(a => a.outcome).length} of {attempts.length} providers responded
            </span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-2">
          {attempts.map((attempt, index) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">#{attempt.rank}</Badge>
                <div>
                  <p className="font-medium">{attempt.provider?.users?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent at {new Date(attempt.sent_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div>
                {attempt.outcome ? (
                  <Badge variant={getOutcomeColor(attempt.outcome) as any}>
                    {attempt.outcome}
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 animate-spin" />
                    Waiting...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DispatchProgress;

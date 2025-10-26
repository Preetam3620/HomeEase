import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Wrench, Home, Plus, LogOut, User } from 'lucide-react';
import VoiceCommand from '@/components/VoiceCommand';

interface UserLayoutProps {
  children: ReactNode;
}

const UserLayout = ({ children }: UserLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === `/app/user${path}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gradient">HomeEase</span>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant={isActive('') ? 'default' : 'ghost'}
                onClick={() => navigate('/app/user')}
              >
                <Home className="w-4 h-4 mr-2" />
                My Jobs
              </Button>
              <Button
                variant={isActive('/create') ? 'default' : 'ghost'}
                onClick={() => navigate('/app/user/create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <VoiceCommand onTranscript={(text) => console.log('Voice:', text)} />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/app/user/profile')}
            >
              <User className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default UserLayout;

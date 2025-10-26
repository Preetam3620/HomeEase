import { useState } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, VoiceAssistantControlBar } from '@livekit/components-react';
import '@livekit/components-styles';

interface VoiceCommandProps {
  onTranscript?: (transcript: string) => void;
  className?: string;
  onJobCreated?: () => void;
}

function VoiceAssistantUI() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="flex flex-col items-center gap-4">
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="w-32 h-16"
      />
      <VoiceAssistantControlBar />
    </div>
  );
}

const VoiceCommand = ({ onTranscript, className, onJobCreated }: VoiceCommandProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');

  const startConversation = async () => {
    try {
      const roomName = `service-booking-${Date.now()}`;
      const participantName = `user-${Date.now()}`;

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName }
      });

      if (error) throw error;
      if (!data?.token || !data?.url) throw new Error('Invalid token response');

      setToken(data.token);
      setServerUrl(data.url);
      setIsConnected(true);

      toast({
        title: "Voice assistant started",
        description: "You can now speak to book a service",
      });
    } catch (error) {
      console.error('Error starting voice assistant:', error);
      toast({
        title: "Failed to start voice assistant",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const stopConversation = () => {
    setIsConnected(false);
    setToken('');
    setServerUrl('');
    
    toast({
      title: "Voice assistant stopped",
      description: "Conversation ended",
    });
  };

  if (isConnected && token && serverUrl) {
    return (
      <div className={className}>
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={stopConversation}
        >
          <VoiceAssistantUI />
          <RoomAudioRenderer />
          <Button 
            onClick={stopConversation}
            variant="destructive"
            className="mt-4"
          >
            <MicOff className="mr-2 h-4 w-4" />
            Stop Voice Assistant
          </Button>
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <Button 
      onClick={startConversation}
      className={className}
      size="lg"
    >
      <Mic className="mr-2 h-4 w-4" />
      Start Voice Booking
    </Button>
  );
};

export default VoiceCommand;

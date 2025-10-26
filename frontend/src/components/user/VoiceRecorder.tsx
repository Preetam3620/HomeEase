import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, VoiceAssistantControlBar } from '@livekit/components-react';
import '@livekit/components-styles';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
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

const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
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
        description: "You can now speak to describe your task",
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
      <div className="flex items-center gap-2">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={stopConversation}
        >
          <VoiceAssistantUI />
          {/* <RoomAudioRenderer /> */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={stopConversation}
              variant="destructive"
              size="lg"
            >
              <MicOff className="mr-2 h-4 w-4" />
              Stop Voice Assistant
            </Button>
          </div>
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={startConversation}
        className="flex-1"
      >
        <Mic className="w-5 h-5 mr-2" />
        Start Voice Input
      </Button>
    </div>
  );
};

export default VoiceRecorder;
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const VoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const encodeAudioData = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };

  const createWavHeader = (dataLength: number, sampleRate: number = 24000) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    return new Uint8Array(buffer);
  };

  const playAudioChunk = async (audioData: Uint8Array) => {
    if (!audioContextRef.current) return;

    audioQueueRef.current.push(audioData);

    if (!isPlayingRef.current) {
      playNextInQueue();
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const audioData = audioQueueRef.current.shift()!;
    
    try {
      const int16Data = new Int16Array(audioData.length / 2);
      for (let i = 0; i < audioData.length; i += 2) {
        int16Data[i / 2] = (audioData[i + 1] << 8) | audioData[i];
      }

      const wavHeader = createWavHeader(int16Data.byteLength);
      const wavArray = new Uint8Array(wavHeader.length + int16Data.byteLength);
      wavArray.set(wavHeader, 0);
      wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.length);

      const audioBuffer = await audioContextRef.current!.decodeAudioData(wavArray.buffer);
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current!.destination);
      
      source.onended = () => playNextInQueue();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      playNextInQueue();
    }
  };

  const startVoiceChat = async () => {
    try {
      setConnecting(true);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Connect to WebSocket (using Lovable AI backend)
      const projectId = "pqdgpxetysqcdcjwormb";
      const ws = new WebSocket(`wss://${projectId}.supabase.co/functions/v1/voice-chat`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnecting(false);
        
        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful AI assistant. Keep responses concise and natural.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            temperature: 0.8
          }
        }));

        // Start recording
        startRecording();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'response.audio.delta' && data.delta) {
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            playAudioChunk(bytes);
          } else if (data.type === 'response.audio_transcript.delta' && data.delta) {
            setTranscript(prev => prev + data.delta);
          } else if (data.type === 'response.audio_transcript.done') {
            setTranscript('');
          } else if (data.type === 'error') {
            console.error('Voice chat error:', data);
            toast({
              title: "Voice chat error",
              description: data.message || "An error occurred",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection error",
          description: "Failed to connect to voice chat",
          variant: "destructive"
        });
        stopVoiceChat();
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        stopVoiceChat();
      };

      toast({
        title: "Voice chat started",
        description: "Speak naturally - AI will respond with voice"
      });
    } catch (error: any) {
      console.error('Error starting voice chat:', error);
      setConnecting(false);
      toast({
        title: "Failed to start voice chat",
        description: error.message || "Please check microphone permissions",
        variant: "destructive"
      });
    }
  };

  const startRecording = () => {
    if (!audioContextRef.current || !mediaStreamRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const audioBase64 = encodeAudioData(new Float32Array(inputData));
      
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioBase64
      }));
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
    processorRef.current = processor;
    setIsRecording(true);
  };

  const stopVoiceChat = () => {
    // Stop recording
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setTranscript('');
  };

  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Voice-to-Voice Chat</h3>
          {isConnected && (
            <Badge variant={isSpeaking ? "default" : "secondary"}>
              {isSpeaking ? "AI Speaking" : isRecording ? "Listening" : "Connected"}
            </Badge>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 py-6">
          {!isConnected ? (
            <Button
              size="lg"
              onClick={startVoiceChat}
              disabled={connecting}
              className="h-24 w-24 rounded-full"
            >
              {connecting ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Phone className="h-8 w-8" />
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={stopVoiceChat}
              className="h-24 w-24 rounded-full"
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
          )}

          <p className="text-center text-muted-foreground">
            {!isConnected 
              ? "Click to start voice conversation" 
              : "Click to end conversation"}
          </p>

          {transcript && (
            <div className="mt-4 p-4 rounded-lg bg-muted w-full">
              <p className="text-sm font-medium mb-1">AI is saying:</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

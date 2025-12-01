import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface WebPlaygroundProps {
  agentId: string;
}

export default function WebPlayground({ agentId }: WebPlaygroundProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: 'agent' | 'user', text: string }>>([]);
  const [error, setError] = useState<string>('');
  const retellClient = useRef<RetellWebClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    retellClient.current = new RetellWebClient();

    retellClient.current.on('conversationStarted', () => {
      console.log('Conversation started');
      setIsConnected(true);
      setIsConnecting(false);
    });

    retellClient.current.on('audio', (audio) => {
      console.log('Audio received:', audio);
    });

    retellClient.current.on('conversationEnded', ({ code, reason }) => {
      console.log('Conversation ended:', code, reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    retellClient.current.on('error', (error) => {
      console.error('Error:', error);
      setError(error.message || 'Ha ocurrido un error');
      setIsConnected(false);
      setIsConnecting(false);
    });

    retellClient.current.on('update', (update) => {
      console.log('Update:', update);
      if (update.transcript) {
        const newTranscript: Array<{ role: 'agent' | 'user', text: string }> = [];

        update.transcript.forEach((item: any) => {
          if (item.role && item.content) {
            newTranscript.push({
              role: item.role,
              text: item.content,
            });
          }
        });

        setTranscript(newTranscript);
      }
    });

    return () => {
      if (retellClient.current) {
        retellClient.current.stopCall();
      }
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  async function startCall() {
    if (!retellClient.current) return;

    setIsConnecting(true);
    setError('');
    setTranscript([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error('No se pudo iniciar la llamada');
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('No se recibió token de acceso');
      }

      await retellClient.current.startCall({
        accessToken: data.access_token,
      });
    } catch (err) {
      console.error('Error starting call:', err);
      setError(err instanceof Error ? err.message : 'Error al iniciar llamada');
      setIsConnecting(false);
    }
  }

  function stopCall() {
    if (retellClient.current) {
      retellClient.current.stopCall();
    }
    setIsConnected(false);
  }

  function toggleMute() {
    if (retellClient.current) {
      const newMuteState = !isMuted;
      retellClient.current.toggleMute();
      setIsMuted(newMuteState);
    }
  }

  function toggleSpeaker() {
    const newSpeakerState = !isSpeakerMuted;
    setIsSpeakerMuted(newSpeakerState);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Chat de Voz con el Agente</h3>
        <p className="text-gray-700 mb-4">
          Haz clic en el botón para iniciar una conversación de voz en tiempo real con tu agente
        </p>

        <div className="flex items-center justify-center gap-4">
          {!isConnected && !isConnecting && (
            <button
              onClick={startCall}
              className="flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Phone className="w-6 h-6" />
              Iniciar Llamada
            </button>
          )}

          {isConnecting && (
            <div className="flex items-center gap-3 bg-yellow-600 text-white px-8 py-4 rounded-xl font-semibold">
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              Conectando...
            </div>
          )}

          {isConnected && (
            <>
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  isMuted
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isMuted ? 'Desactivado' : 'Micrófono'}
              </button>

              <button
                onClick={toggleSpeaker}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  isSpeakerMuted
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                {isSpeakerMuted ? 'Sin Audio' : 'Audio'}
              </button>

              <button
                onClick={stopCall}
                className="flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-red-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <PhoneOff className="w-6 h-6" />
                Colgar
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-4 text-red-800">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <h4 className="font-semibold text-gray-900">Transcripción en Tiempo Real</h4>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {transcript.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>La transcripción de la conversación aparecerá aquí...</p>
            </div>
          ) : (
            transcript.map((item, index) => (
              <div
                key={index}
                className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    item.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {item.role === 'user' ? 'Tú' : 'Agente'}
                  </p>
                  <p className="text-sm">{item.text}</p>
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-2">💡 Consejos para usar el Playground:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>Asegúrate de permitir el acceso al micrófono cuando el navegador lo solicite</li>
          <li>Habla con claridad y a velocidad normal</li>
          <li>Puedes silenciar tu micrófono en cualquier momento</li>
          <li>La transcripción se actualiza en tiempo real mientras hablas</li>
        </ul>
      </div>
    </div>
  );
}

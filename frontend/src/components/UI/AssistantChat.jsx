import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader, Sprout, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { assistantAPI } from '../../api';

const SUGGESTIONS = [
  "Donne-moi des conseils pour mes parcelles",
  "Quelle est l'humidité du sol ?",
  "Y a-t-il des alertes ?",
  "Comment fonctionne l'irrigation ?",
];

// Détection du support vocal navigateur (Chrome/Edge uniquement, en français)
const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;
const speechSupported = !!SpeechRecognitionAPI;
const synthSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Bonjour 👋 Je suis l'assistant AgroSmart. Pose-moi une question sur tes capteurs, parcelles, alertes ou l'irrigation !" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false); // lecture vocale manuelle activée par l'utilisateur
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Initialiser la reconnaissance vocale une seule fois (français)
  useEffect(() => {
    if (!speechSupported) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      sendMessage(transcript, true); // true = message vocal, déclenche la réponse parlée
    };

    recognition.onerror = (event) => {
      console.warn('Erreur reconnaissance vocale:', event.error);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch {}
    };
  }, []);

  const speak = (text, isVoice) => {
    if (!synthSupported) return;
    // Lit la réponse à voix haute si l'utilisateur a parlé pour poser sa question
    // (conversation vocale naturelle) OU s'il a activé la lecture manuellement
    if (!voiceOn && !isVoice) return;
    const cleanText = text
      .replace(/[*_`]/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .trim();
    if (!cleanText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // déjà démarré, ignorer
      }
    }
  };

  const sendMessage = async (text, isVoice = false) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await assistantAPI.chat(msg);
      const reply = res?.reply || "Désolé, je n'ai pas pu traiter ta question.";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      speak(reply, isVoice);
    } catch (err) {
      const errText = "Erreur de connexion. Réessaie dans un instant.";
      setMessages(prev => [...prev, { role: 'assistant', text: errText }]);
      speak(errText, isVoice);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center justify-center"
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2e7d32, #43a047)',
            boxShadow: '0 6px 20px rgba(46,125,50,0.4)',
            border: 'none', cursor: 'pointer',
            animation: 'fab-bounce 3s ease-in-out infinite'
          }}
        >
          <MessageCircle size={24} color="white" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-5 right-5 z-40 flex flex-col"
          style={{
            width: 360, maxWidth: 'calc(100vw - 40px)',
            height: 480, maxHeight: 'calc(100vh - 100px)',
            background: 'var(--f-surface)',
            borderRadius: 20,
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            border: '1px solid var(--f-border)',
            overflow: 'hidden',
            animation: 'card-pop 0.3s ease forwards'
          }}
        >
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)' }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sprout size={16} color="white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Assistant AgroSmart</p>
                <p className="text-xs text-white" style={{ opacity: 0.8 }}>En ligne</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {synthSupported && (
                <button
                  onClick={() => setVoiceOn(v => {
                    if (v) window.speechSynthesis.cancel();
                    return !v;
                  })}
                  title={voiceOn ? "Toujours lire les réponses : activé" : "Toujours lire les réponses : désactivé (mais répond à voix haute si tu parles)"}
                  style={{ color: 'white', cursor: 'pointer', opacity: voiceOn ? 1 : 0.6, padding: 4 }}
                >
                  {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ color: 'white', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ background: 'var(--f-surface2)' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="px-3 py-2 rounded-2xl text-sm"
                  style={{
                    maxWidth: '85%',
                    whiteSpace: 'pre-wrap',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #2e7d32, #43a047)' : 'var(--f-surface)',
                    color: m.role === 'user' ? 'white' : 'var(--f-text)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--f-border)',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl flex items-center gap-1"
                  style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)' }}>
                  <Loader size={14} className="animate-spin" style={{ color: 'var(--f-primary)' }} />
                </div>
              </div>
            )}

            {messages.length <= 1 && !loading && (
              <div className="flex flex-col gap-1.5 pt-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-left px-3 py-2 rounded-xl text-xs transition-colors"
                    style={{ background: 'var(--f-primary-light)', color: 'var(--f-primary)', border: '1px solid rgba(46,125,50,0.2)' }}>
                    💬 {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: '1px solid var(--f-border)', background: 'var(--f-surface)' }}>
            {speechSupported && (
              <button
                onClick={toggleListening}
                title={listening ? "Arrêter l'écoute" : "Parler (français)"}
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: listening ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'var(--f-surface2)',
                  border: listening ? 'none' : '1px solid var(--f-border)',
                  cursor: 'pointer',
                  animation: listening ? 'pulse-dot 1s ease-in-out infinite' : 'none',
                }}
              >
                {listening ? <MicOff size={16} color="white" /> : <Mic size={16} style={{ color: 'var(--f-text2)' }} />}
              </button>
            )}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder={listening ? "Je t'écoute..." : "Pose ta question..."}
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', color: 'var(--f-text)' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                border: 'none', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1
              }}
            >
              <Send size={16} color="white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

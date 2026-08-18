'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Phone, PhoneOff, MicOff, MessageSquare, X } from 'lucide-react';

export default function CallPage() {
  const [voice, setVoice] = useState<'male' | 'female' | null>(null);
  const [status, setStatus] = useState<'tap' | 'listening' | 'thinking' | 'speaking'>('tap');
  const [transcript, setTranscript] = useState<{ who: string; text: string }[]>([]);
  const [showT, setShowT] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const active = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!voice) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [voice]);

  const speakText = (text: string, onEnd: () => void) => {
    const clean = text.replace(/[*#`_]/g, '').slice(0, 300);
    const urdu = /[\u0600-\u06FF]/.test(clean);
    const g = (tl: string) =>
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + tl + '&text=' + encodeURIComponent(clean);
    const chain: { url: string; rate: number }[] =
      voice === 'male'
        ? [
            { url: 'https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=' + encodeURIComponent(clean), rate: 1 },
            { url: 'https://api.streamelements.com/kappa/v2/speech?voice=Russell&text=' + encodeURIComponent(clean), rate: 1 },
            { url: g('en'), rate: 0.78 },
          ]
        : urdu
        ? [
            { url: g('ur'), rate: 1 },
            { url: g('hi'), rate: 1 },
          ]
        : [
            { url: g('en'), rate: 1 },
            { url: 'https://api.streamelements.com/kappa/v2/speech?voice=Amy&text=' + encodeURIComponent(clean), rate: 1 },
          ];
    let i = 0;
    const tryNext = () => {
      if (i >= chain.length) {
        try {
          const u = new SpeechSynthesisUtterance(clean);
          (window as any).__omnix_u = u;
          u.onend = onEnd;
          u.onerror = onEnd;
          speechSynthesis.speak(u);
        } catch {
          onEnd();
        }
        return;
      }
      const a = new Audio(chain[i].url);
      const rate = chain[i].rate;
      i++;
      a.onplay = () => {
        a.playbackRate = rate;
      };
      a.onended = onEnd;
      a.onerror = tryNext;
      a.play().catch(tryNext);
    };
    tryNext();
  };

  const listen = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ur-PK';
    rec.interimResults = false;
    setStatus('listening');
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      try { rec.stop(); } catch {}
      setTranscript(m => [...m, { who: 'user', text: t }]);
      setStatus('thinking');
      (async () => {
        busy.current = true;
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', text: t }], modelId: '', stream: false, call: true, voice }),
          });
          const j = await res.json();
          setTranscript(m => [...m, { who: 'ai', text: j.reply }]);
          setStatus('speaking');
          speakText(j.reply, () => {
            busy.current = false;
            if (active.current) setStatus('tap');
          });
        } catch {
          busy.current = false;
          if (active.current) setStatus('tap');
        }
      })();
    };
    rec.onend = () => {
      if (active.current && !busy.current) setStatus('tap');
    };
    rec.onerror = () => setStatus('tap');
    try { rec.start(); } catch {}
  };

  const start = (v: 'male' | 'female') => {
    setVoice(v);
    active.current = true;
    setStatus('speaking');
    const u = new SpeechSynthesisUtterance('');
    void u;
    speakText('Ji boliye, main sun raha hoon', () => setStatus('tap'));
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (!voice)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#151515] border border-white/10 rounded-3xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <p className="text-base font-bold mb-1">OmniX Voice Call</p>
          <p className="text-[10px] text-white/40 mb-6">Awaaz chunein - AI usi mein baat karega</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => start('male')} className="py-4 rounded-2xl bg-blue-500/10 border border-blue-500/40 text-blue-300 font-bold text-sm">👨 Male</button>
            <button onClick={() => start('female')} className="py-4 rounded-2xl bg-pink-500/10 border border-pink-500/40 text-pink-300 font-bold text-sm">👩 Female</button>
          </div>
          <a href="/" className="block w-full py-2 text-[10px] text-white/40">← Wapas</a>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#201008] via-[#140b06] to-black text-white flex flex-col">
      <div className="pt-10 pb-2 text-center">
        <div className="w-20 h-20 mx-auto mb-3 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/30">
          <Phone className="w-9 h-9 text-white" />
        </div>
        <p className="text-lg font-bold">OmniX</p>
        <p className="text-[11px] text-white/40">{voice === 'male' ? '👨 Male' : '👩 Female'} · {mm}:{ss}</p>
        <p className="text-[11px] mt-1 text-orange-300 font-bold">
          {status === 'listening' ? '🎤 Sun raha hoon...' : status === 'thinking' ? '🤔 Soch raha hoon...' : status === 'speaking' ? '🔊 Bol raha hoon...' : muted ? '🔇 Muted - circle tap karein' : '👆 Circle tap karein aur boliye'}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {status === 'speaking' && (
            <>
              <div className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" />
              <div className="absolute -inset-4 rounded-full bg-orange-500/10 animate-pulse" />
            </>
          )}
          {status === 'listening' && <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />}
          <button
            onClick={() => {
              if (status === 'tap' && !muted) listen();
            }}
            className="relative w-36 h-36 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/50"
          >
            {status === 'listening' ? <Mic className="w-14 h-14 text-white" /> : <Mic className="w-14 h-14 text-white/80" />}
          </button>
        </div>
      </div>

      {showT && (
        <div className="mx-6 mb-4 max-h-48 overflow-y-auto space-y-2 bg-black/60 border border-white/10 rounded-2xl p-3">
          {transcript.map((t, i) => (
            <div key={i} className={`px-3 py-2 rounded-xl text-xs max-w-[85%] ${t.who === 'user' ? 'bg-orange-500/20 ml-auto' : 'bg-white/[0.07] mr-auto'}`}>{t.text}</div>
          ))}
          {transcript.length === 0 && <p className="text-[10px] text-white/30 text-center">Abhi koi baat nahi hui</p>}
        </div>
      )}

      <div className="pb-10 flex items-center justify-center gap-5">
        <button
          onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center border ${muted ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10'}`}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowT(!showT)}
          className={`w-14 h-14 rounded-full flex items-center justify-center border ${showT ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10'}`}
        >
          {showT ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

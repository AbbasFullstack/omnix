'use client';

import { useState } from 'react';
import { ArrowLeft, Download, Music } from 'lucide-react';

export default function AudioPage() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const generate = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setUrl('');
    setStatus('🎙️ Audio ban rahi hai (Flux TTS)...');
    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const j = await res.json();
      if (j.audio) {
        const bin = atob(j.audio);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        setUrl(URL.createObjectURL(new Blob([bytes], { type: j.mime || 'audio/mpeg' })));
        setStatus('✅ Audio tayyar!');
      } else {
        setStatus('⚠️ ' + (j.error || 'Audio fail'));
      }
    } catch {
      setStatus('⚠️ Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
        <a href="/" className="p-2 rounded-lg bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </a>
        <p className="text-sm font-bold">🎙️ OmniX Audio (Flux TTS)</p>
      </div>
      <div className="p-4 max-w-3xl mx-auto w-full">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="Jo bolna hai woh likhein: jaise 'Assalam o Alaikum, yeh meri pehli AI audio hai!'"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50 resize-none"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="mt-3 w-full py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Music className="w-4 h-4" /> {loading ? 'Ban rahi hai...' : 'Audio Banayein'}
        </button>
        {status && <p className="text-center text-xs text-orange-300 mt-4 animate-pulse">{status}</p>}
        {url && (
          <div className="mt-6 space-y-3">
            <audio src={url} controls className="w-full" />
            <a href={url} download="omnix-audio.mp3" className="w-full py-3 rounded-xl bg-white/5 border border-orange-500/30 text-sm font-bold flex items-center justify-center gap-2 text-orange-300">
              <Download className="w-4 h-4" /> Audio Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

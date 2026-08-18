'use client';

import { useState } from 'react';
import { ArrowLeft, Clapperboard, Download } from 'lucide-react';

export default function VideoPage() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const genFrame = async (p: string): Promise<string> => {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: p }),
    });
    const j = await res.json();
    if (!j.image) throw new Error('frame fail');
    return j.image;
  };

  const loadImg = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });

  const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, zoom: number, panX: number) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const scale = Math.max(cw / img.width, ch / img.height) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (cw - w) / 2 + panX, (ch - h) / 2, w, h);
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setVideoUrl('');
    try {
      const variants = [
        ', wide establishing shot',
        ', medium shot closer view',
        ', close-up detail shot',
        ', dramatic final cinematic shot',
      ];
      const frames: HTMLImageElement[] = [];
      for (let i = 0; i < variants.length; i++) {
        setStatus('🎬 Frame ' + (i + 1) + '/4 ban raha hai...');
        frames.push(await loadImg(await genFrame(prompt.trim() + variants[i])));
      }

      setStatus('🎥 Video record ho raha hai...');
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;
      const stream = canvas.captureStream(30);
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch {
        rec = new MediaRecorder(stream);
      }
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const stopped = new Promise<void>((res) => (rec.onstop = () => res()));
      rec.start();

      for (let i = 0; i < frames.length; i++) {
        await new Promise<void>((res) => {
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / 2000);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 1280, 720);
            drawCover(ctx, frames[i], 1 + 0.15 * p, (i % 2 === 0 ? -1 : 1) * 40 * p);
            if (p < 1) requestAnimationFrame(tick);
            else res();
          };
          requestAnimationFrame(tick);
        });
      }

      rec.stop();
      await stopped;
      setVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
      setStatus('✅ Video tayyar!');
    } catch {
      setStatus('⚠️ Video banane mein masla - dobara try karein');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
        <a href="/" className="p-2 rounded-lg bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </a>
        <p className="text-sm font-bold">🎬 OmniX Video</p>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full">
        <div className="flex gap-2 mb-6">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="Video scene: jaise neon city at night, red BMW..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="px-5 py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold disabled:opacity-50"
          >
            {busy ? '...' : '🎬 Banayein'}
          </button>
        </div>

        {status && <p className="text-center text-xs text-orange-300 mb-6 animate-pulse">{status}</p>}

        {videoUrl && (
          <>
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-2xl border border-orange-500/30 shadow-2xl shadow-orange-500/20" />
            <a
              href={videoUrl}
              download="omnix-video.webm"
              className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-orange-500/30 text-sm font-bold flex items-center justify-center gap-2 text-orange-300"
            >
              <Download className="w-4 h-4" /> Video Download
            </a>
          </>
        )}
      </div>
    </div>
  );
}

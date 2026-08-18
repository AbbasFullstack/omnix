'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ArrowLeft, Sparkles } from 'lucide-react';

export default function SlidesPage() {
  const [topic, setTopic] = useState('');
  const [deck, setDeck] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setDeck(null);
    try {
      const res = await fetch('/api/slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const j = await res.json();
      if (j.deck) {
        setDeck(j.deck);
        setIdx(0);
      } else {
        alert(j.error || 'Slides banane mein masla');
      }
    } catch {
      alert('Network error');
    }
    setLoading(false);
  };

  const wrap = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) => {
    const words = String(text).split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = w + ' ';
        yy += lh;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
    return yy + lh;
  };

  const download = () => {
    if (!deck || !deck.slides[idx]) return;
    const slide = deck.slides[idx];
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#1c0f06');
    grad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(80, 110, 8, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    let y = wrap(ctx, slide.heading || '', 120, 160, 1060, 58);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    y = Math.max(y + 40, 300);
    (slide.points || []).forEach((pt: string) => {
      y = wrap(ctx, '•  ' + pt, 120, y, 1060, 40);
      y += 18;
    });
    ctx.fillStyle = 'rgba(249,115,22,0.9)';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('OmniX - ' + (deck.title || topic), 80, 665);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(idx + 1 + ' / ' + deck.slides.length, 1200, 665);
    ctx.textAlign = 'left';
    const a = document.createElement('a');
    a.download = 'omnix-slide-' + (idx + 1) + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };

  const slide = deck?.slides?.[idx];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
        <a href="/" className="p-2 rounded-lg bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </a>
        <p className="text-sm font-bold">📊 OmniX Slides</p>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full">
        <div className="flex gap-2 mb-6">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="Topic likhein: jaise Solar System, AI, Pakistan..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
          />
          <button
            onClick={generate}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> {loading ? '...' : 'Banayein'}
          </button>
        </div>

        {loading && (
          <div className="text-center py-20 text-white/40 text-sm animate-pulse">📊 Slides ban rahi hain...</div>
        )}

        {deck && slide && (
          <>
            <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#1c0f06] to-[#0d0d0d] p-8 min-h-[420px] flex flex-col shadow-2xl shadow-orange-500/10">
              <p className="text-[10px] text-orange-300 font-bold mb-2 uppercase">{deck.title || topic}</p>
              <h2 className="text-2xl font-bold mb-6">{slide.heading}</h2>
              <ul className="space-y-3">
                {(slide.points || []).map((pt: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm text-white/80 leading-relaxed">
                    <span className="text-orange-400 font-bold">•</span> {pt}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-8">
                <button
                  onClick={() => setIdx(Math.max(0, idx - 1))}
                  disabled={idx === 0}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-white/40 font-bold">{idx + 1} / {deck.slides.length}</p>
                <button
                  onClick={() => setIdx(Math.min(deck.slides.length - 1, idx + 1))}
                  disabled={idx === deck.slides.length - 1}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={download}
              className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-orange-500/30 text-sm font-bold flex items-center justify-center gap-2 text-orange-300"
            >
              <Download className="w-4 h-4" /> Slide {idx + 1} Download PNG
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'text missing' }, { status: 400 });

  let modelId = '';
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    const list = j.data || [];
    const m = list.find((m: any) => m.id.includes('deepgram') && m.id.includes('flux')) || list.find((m: any) => m.id.includes('deepgram'));
    modelId = m?.id || '';
  } catch {}
  if (!modelId) return NextResponse.json({ error: 'TTS model nahi mila' });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://omnix-pi.vercel.app',
      'X-Title': 'OmniX',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: text }],
    }),
  });
  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  let b64 = '';
  let mime = 'audio/mpeg';
  const rawAudio = msg?.audio;
  if (rawAudio && typeof rawAudio === 'object' && rawAudio.data) {
    b64 = rawAudio.data;
  } else if (typeof rawAudio === 'string') {
    b64 = rawAudio;
  } else if (typeof msg?.content === 'string' && msg.content.startsWith('data:audio')) {
    const mm = msg.content.match(/^data:(audio\/[a-z0-9]+);base64,(.+)$/s);
    if (mm) { mime = mm[1]; b64 = mm[2]; }
  }
  if (!b64) return NextResponse.json({ error: 'Audio generate nahi hua', debug: Object.keys(msg || {}) });
  return NextResponse.json({ audio: b64, mime, model: modelId });
}

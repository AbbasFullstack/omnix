import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: 'text missing' }, { status: 400 });

  const modelId = 'deepgram/flux-tts:free';

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

  // OpenRouter TTS response shape: message.audio = { data: base64, expires_at, ... }
  const rawAudio = msg?.audio;
  if (rawAudio && typeof rawAudio === 'object' && rawAudio.data) {
    b64 = String(rawAudio.data);
  } else if (typeof rawAudio === 'string') {
    b64 = rawAudio;
  } else if (typeof msg?.content === 'string' && msg.content.startsWith('data:audio')) {
    const mm = msg.content.match(/^data:(audio\/[a-z0-9]+);base64,([\s\S]+)$/);
    if (mm) { mime = mm[1]; b64 = mm[2]; }
  }

  if (!b64) {
    console.error('TTS debug:', { msgKeys: Object.keys(msg || {}), audio: rawAudio, content: msg?.content?.slice(0, 100) });
    return NextResponse.json({ error: 'Audio generate nahi hua - OpenRouter response check karein', debug: { msgKeys: Object.keys(msg || {}), hasAudio: !!rawAudio } });
  }

  return NextResponse.json({ audio: b64, mime, model: modelId });
}

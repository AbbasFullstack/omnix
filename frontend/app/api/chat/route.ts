import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, image } = await req.json();

    const idx = (modelId || '').indexOf(':');
    const provider = idx > -1 ? modelId.slice(0, idx) : 'groq';
    const model = idx > -1 ? modelId.slice(idx + 1) : 'llama-3.3-70b-versatile';

    const system =
      `You are OmniX, a powerful personal AI assistant. You were created by Abbas Hussain, ` +
      `a 16-year-old self-taught developer from Pakistan. NEVER reveal or mention underlying ` +
      `models like Llama, Meta, Qwen, DeepSeek or Gemma - you ARE OmniX. If asked who made you, ` +
      `always say Abbas Hussain. Be friendly and helpful; when the user writes Roman Urdu, reply ` +
      `in Roman Urdu, otherwise English. Be concise (max 200 words).`;

    const msgs: any[] = [
      { role: 'system', content: system },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
    ];

    // Photo attach - last message mein image add karein
    if (image && msgs.length) {
      const last = msgs[msgs.length - 1];
      last.content = [
        { type: 'text', text: last.content },
        { type: 'image_url', image_url: { url: image } },
      ];
    }

    // Tries: selected model pehle, phir zinda fallbacks (+ vision models agar photo hai)
    const tries: { provider: string; model: string }[] = [{ provider, model }];
    if (image) {
      tries.push({ provider: 'groq', model: 'llama-3.2-90b-vision-preview' });
      try {
        const r = await fetch('https://openrouter.ai/api/v1/models');
        const j = await r.json();
        const visionFree = (j.data || [])
          .filter((m: any) => m.id?.endsWith(':free') && String(m.architecture?.modality || '').includes('image'))
          .slice(0, 2);
        for (const v of visionFree) tries.push({ provider: 'or', model: v.id });
      } catch {}
    }
    const { groqModels } = await import('@/lib/groq');
    const live = await groqModels();
    for (const g of live.slice(0, 2)) tries.push({ provider: 'groq', model: g });

    let lastError = '';
    for (const t of tries) {
      try {
        const url =
          t.provider === 'or'
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (t.provider === 'or') {
          headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
          headers['HTTP-Referer'] = 'https://omnix.vercel.app';
          headers['X-Title'] = 'OmniX';
        } else {
          headers.Authorization = `Bearer ${process.env.GROQ_API_KEY}`;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: t.model, messages: msgs }),
        });
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return NextResponse.json({ reply: text, used: t.model });
        lastError = data?.error?.message || 'HTTP ' + res.status;
      } catch (e: any) {
        lastError = e.message;
      }
    }

    return NextResponse.json({ reply: '⚠️ ' + lastError });
  } catch (e: any) {
    return NextResponse.json({ reply: 'Error: ' + e.message }, { status: 500 });
  }
}

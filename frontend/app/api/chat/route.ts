import { NextRequest, NextResponse } from 'next/server';
import { groqModels } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, image, stream } = await req.json();

    const idx = (modelId || '').indexOf(':');
    const provider = idx > -1 ? modelId.slice(0, idx) : 'groq';
    const model = idx > -1 ? modelId.slice(idx + 1) : 'openai/gpt-oss-20b';

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

    if (image && msgs.length) {
      const last = msgs[msgs.length - 1];
      last.content = [
        { type: 'text', text: last.content },
        { type: 'image_url', image_url: { url: image } },
      ];
    }

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
    const live = await groqModels();
    for (const g of live.slice(0, 2)) tries.push({ provider: 'groq', model: g });

    const urlFor = (p: string) =>
      p === 'or'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : p === 'hf'
        ? 'https://router.huggingface.co/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';
    const headersFor = (p: string) => {
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (p === 'or') {
        h.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
        h['HTTP-Referer'] = 'https://omnix-pi.vercel.app';
        h['X-Title'] = 'OmniX';
      } else if (p === 'hf') {
        h.Authorization = `Bearer ${process.env.HF_TOKEN}`;
      } else {
        h.Authorization = `Bearer ${process.env.GROQ_API_KEY}`;
      }
      return h;
    };

    // JSON mode (AI Writer waghera)
    if (!stream) {
      let lastError = '';
      for (const t of tries) {
        try {
          const res = await fetch(urlFor(t.provider), {
            method: 'POST',
            headers: headersFor(t.provider),
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
    }

    // STREAMING mode (SSE)
    const enc = new TextEncoder();
    for (const t of tries) {
      const res = await fetch(urlFor(t.provider), {
        method: 'POST',
        headers: headersFor(t.provider),
        body: JSON.stringify({ model: t.model, messages: msgs, stream: true }),
      });
      if (!res.ok || !res.body) continue;
      const upstream = res.body;
      const used = t.model;

      const out = new ReadableStream({
        async start(controller) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ used })}\n\n`));
          const reader = upstream.getReader();
          const dec = new TextDecoder();
          let buf = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop() || '';
              for (const line of lines) {
                const s = line.trim();
                if (!s.startsWith('data: ')) continue;
                const d = s.slice(6);
                if (d === '[DONE]') continue;
                try {
                  const j = JSON.parse(d);
                  const delta = j.choices?.[0]?.delta?.content || '';
                  if (delta) controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                } catch {}
              }
            }
          } catch {}
          controller.enqueue(enc.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(out, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    return NextResponse.json({ reply: '⚠️ Sab models fail ho gaye' });
  } catch (e: any) {
    return NextResponse.json({ reply: 'Error: ' + e.message }, { status: 500 });
  }
}

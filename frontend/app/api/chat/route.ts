import { NextRequest, NextResponse } from 'next/server';
import { getMemories } from '@/lib/supabase-server';

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function orHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'HTTP-Referer': 'https://omnix-pi.vercel.app',
    'X-Title': 'OmniX',
  };
}

async function freeModels(): Promise<any[]> {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    return (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, image, stream, call, voice } = await req.json();

    const idx = (modelId || '').indexOf(':');
    const model = idx > -1 ? modelId.slice(idx + 1) : '';

    const mem = await getMemories();
    const memLine = mem.length
      ? ' PERSONAL MEMORIES about the user: ' + mem.join('; ') + '. Use these naturally in conversation.'
      : '';
    const callLine = call
      ? voice === 'male'
        ? ' VOICE CALL MODE: Keep reply under 60 words. If the user writes Roman Urdu, reply in Roman Urdu; if English, reply in English.'
        : ' VOICE CALL MODE: Keep reply under 60 words. If the user writes Roman Urdu, reply in Urdu script; if English, reply in English.'
      : '';
    const system =
      `You are OmniX, a powerful personal AI assistant. You were created by Abbas Hussain, ` +
      `a 16-year-old self-taught developer from Pakistan. NEVER reveal or mention underlying ` +
      `models like Llama, Meta, Qwen, DeepSeek or Gemma - you ARE OmniX. If asked who made you, ` +
      `always say Abbas Hussain. Be friendly and helpful; when the user writes Roman Urdu, reply ` +
      `in Roman Urdu, otherwise English. Be concise (max 200 words).` + memLine + callLine;

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

    const free = await freeModels();
    const tries: { model: string }[] = model ? [{ model }] : [];
    if (image) {
      const vis = free
        .filter((m) => String(m.architecture?.modality || '').includes('image'))
        .slice(0, 2);
      for (const v of vis) if (!tries.some((t) => t.model === v.id)) tries.push({ model: v.id });
    }
    for (const m of free.slice(0, 3)) {
      if (!tries.some((t) => t.model === m.id)) tries.push({ model: m.id });
    }

    if (!stream) {
      let lastErr = '';
      for (const t of tries) {
        try {
          const res = await fetch(OR_URL, {
            method: 'POST',
            headers: await orHeaders(),
            body: JSON.stringify({ model: t.model, messages: msgs }),
          });
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return NextResponse.json({ reply: text, used: t.model });
          lastErr = data?.error?.message || 'HTTP ' + res.status;
        } catch (e: any) {
          lastErr = e.message;
        }
      }
      return NextResponse.json({ reply: '⚠️ ' + lastErr });
    }

    const enc = new TextEncoder();
    let lastErr = '';
    for (const t of tries) {
      const res = await fetch(OR_URL, {
        method: 'POST',
        headers: await orHeaders(),
        body: JSON.stringify({ model: t.model, messages: msgs, stream: true }),
      });
      if (!res.ok || !res.body) {
        lastErr += t.model + '→' + res.status + ' | ';
        continue;
      }
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

    return NextResponse.json({ reply: '⚠️ Sab models fail: ' + lastErr });
  } catch (e: any) {
    return NextResponse.json({ reply: 'Error: ' + e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function freeModels(): Promise<any[]> {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    return (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
  } catch {
    return [];
  }
}

function parseDeck(text: string) {
  if (!text) return null;
  const t = text.replace(/```json|```/g, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const j = JSON.parse(t.slice(start, end + 1));
    if (j && Array.isArray(j.slides)) return j;
    if (Array.isArray(j)) return { title: '', slides: j };
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic) return NextResponse.json({ error: 'topic missing' }, { status: 400 });

  const free = await freeModels();
  const prio = ['deepseek', 'qwen', 'gemma', 'mistral', 'llama', 'nemotron'];
  const sorted = [...free].sort((a: any, b: any) => {
    const pa = prio.findIndex(k => a.id.includes(k));
    const pb = prio.findIndex(k => b.id.includes(k));
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  const sys =
    'You are a presentation maker. Return ONLY valid JSON (no markdown, no code fences, no explanation). ' +
    'Schema: {"title": string, "slides": [{"heading": string, "points": [3-4 short strings]}]}. ' +
    'Make exactly 6 slides. Match the user language: Roman Urdu or English.';

  for (const m of sorted.slice(0, 3)) {
    try {
      const res = await fetch(OR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://omnix-pi.vercel.app',
          'X-Title': 'OmniX',
        },
        body: JSON.stringify({
          model: m.id,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: 'Make a presentation about: ' + topic },
          ],
        }),
      });
      const data = await res.json();
      const deck = parseDeck(data?.choices?.[0]?.message?.content);
      if (deck && deck.slides?.length) return NextResponse.json({ deck });
    } catch {}
  }
  return NextResponse.json({ error: 'Slides banane mein masla - dobara try karein' });
}

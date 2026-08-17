import { NextResponse } from 'next/server';

export async function GET() {
  const models: { id: string; name: string; tag: string; vision: boolean }[] = [
    { id: 'groq:llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Groq · Fast', vision: false },
    { id: 'groq:llama-3.1-8b-instant', name: 'Llama 3.1 8B', tag: 'Groq · Instant', vision: false },
    { id: 'groq:openai/gpt-oss-20b', name: 'GPT-OSS 20B', tag: 'OpenAI · Reasoning', vision: false },
    { id: 'groq:llama-3.2-90b-vision-preview', name: 'Vision 90B 📸', tag: 'Groq · Photos', vision: true },
  ];
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    const free = (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
    const prio = ['deepseek', 'qwen', 'gemma', 'mistral', 'llama', 'step'];
    const sorted = [...free].sort((a: any, b: any) => {
      const pa = prio.findIndex(k => a.id.includes(k));
      const pb = prio.findIndex(k => b.id.includes(k));
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });
    const seen = new Set<string>();
    for (const m of sorted) {
      if (models.length >= 10) break;
      const base = (m.id.split('/')[1] || m.id).replace(':free', '');
      if (seen.has(base)) continue;
      seen.add(base);
      const vision = String(m.architecture?.modality || '').includes('image');
      models.push({ id: 'or:' + m.id, name: base, tag: 'OpenRouter · Free', vision });
    }
  } catch {}
  return NextResponse.json({ models });
}

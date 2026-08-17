import { NextResponse } from 'next/server';
import { groqModels } from '@/lib/groq';

export async function GET() {
  const models: { id: string; name: string; tag: string; vision: boolean }[] = [];

  const ids = await groqModels();
  const pick = (ks: string[]) => ids.find(i => ks.some(k => i.toLowerCase().includes(k)));

  const pro = pick(['llama-3.3', 'llama-4', '70b']);
  const reason = pick(['gpt-oss-120b', 'gpt-oss']);
  const vision = pick(['vision', 'scout']);
  const instant = pick(['8b', 'instant', '20b']);

  if (pro) models.push({ id: 'groq:' + pro, name: pro.split('/').pop()!, tag: 'Groq · Pro', vision: false });
  if (reason) models.push({ id: 'groq:' + reason, name: reason.split('/').pop()!, tag: 'Groq · Reasoning', vision: false });
  if (vision) models.push({ id: 'groq:' + vision, name: 'Vision 📸', tag: 'Groq · Photos', vision: true });
  if (instant) models.push({ id: 'groq:' + instant, name: instant.split('/').pop()!, tag: 'Groq · Instant', vision: false });

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
      const vis = String(m.architecture?.modality || '').includes('image');
      models.push({ id: 'or:' + m.id, name: base, tag: 'OpenRouter · Free', vision: vis });
    }
  } catch {}

  return NextResponse.json({ models });
}

import { NextResponse } from 'next/server';
import { groqModels } from '@/lib/groq';

export async function GET() {
  const models: { id: string; name: string; tag: string; vision: boolean }[] = [];

  const ids = await groqModels();
  const gq = ids.find(i => i.includes('gpt-oss-120b')) || ids[0];
  if (gq) models.push({ id: 'groq:' + gq, name: 'OmniX Fast', tag: 'Groq · Bonus', vision: false });

  let free: any[] = [];
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    free = (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
  } catch {}

  const prio = ['deepseek', 'qwen', 'gemma', 'mistral', 'llama', 'step', 'dots', 'nemotron'];
  const sorted = [...free].sort((a: any, b: any) => {
    const pa = prio.findIndex(k => a.id.includes(k));
    const pb = prio.findIndex(k => b.id.includes(k));
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  const base = (m: any) => (String(m.id).split('/')[1] || m.id).replace(':free', '');
  const isVis = (m: any) => String(m.architecture?.modality || '').includes('image');
  const push = (m: any, name: string, tag: string) => {
    if (m) models.push({ id: 'or:' + m.id, name, tag, vision: isVis(m) });
  };

  push(sorted[0], base(sorted[0]), 'OpenRouter · Pro');
  const second = sorted.find((m) => base(m) !== base(sorted[0] || {}));
  push(second, base(second), 'OpenRouter · Fast');
  const rv = sorted.find((m) => m.id.includes('r1') || m.id.includes('reason'));
  push(rv, 'Reasoning', 'OpenRouter · Think');
  const vv = sorted.find((m) => isVis(m));
  push(vv, 'Vision 📸', 'OpenRouter · Photos');

  return NextResponse.json({ models });
}

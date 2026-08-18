import { NextResponse } from 'next/server';
import { groqModels } from '@/lib/groq';

export async function GET() {
  const models: { id: string; name: string; tag: string; vision: boolean }[] = [];

  // 1) Groq - sab se tez zinda model
  const ids = await groqModels();
  const gq = ids.find(i => i.includes('gpt-oss-120b')) || ids.find(i => i.includes('gpt-oss')) || ids[0];
  if (gq) models.push({ id: 'groq:' + gq, name: 'OmniX Fast', tag: 'Groq · Fastest', vision: false });

  // 2) OpenRouter - best free model
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    const free = (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
    const prio = ['deepseek', 'qwen', 'gemma-4-26b', 'gemma', 'mistral', 'llama'];
    const sorted = [...free].sort((a: any, b: any) => {
      const pa = prio.findIndex(k => a.id.includes(k));
      const pb = prio.findIndex(k => b.id.includes(k));
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });
    if (sorted[0]) {
      const base = (sorted[0].id.split('/')[1] || sorted[0].id).replace(':free', '');
      models.push({
        id: 'or:' + sorted[0].id,
        name: base,
        tag: 'OpenRouter · Free',
        vision: String(sorted[0].architecture?.modality || '').includes('image'),
      });
    }
    const r1 =
      free.find((m: any) => String(m.id).includes('deepseek-r1')) ||
      free.find((m: any) => String(m.id).includes('reasoner'));
    models.push({
      id: 'or:' + (r1 ? r1.id : 'deepseek/deepseek-r1:free'),
      name: 'DeepSeek R1',
      tag: 'Reasoning · Pro',
      vision: false,
    });
  } catch {}

  // 3) HuggingFace
  models.push({ id: 'hf:Qwen/Qwen3-8B', name: 'Qwen3 8B', tag: 'HuggingFace', vision: false });

  return NextResponse.json({ models });
}

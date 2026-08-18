import { NextResponse } from 'next/server';

export async function GET() {
  const models: { id: string; name: string; tag: string; vision: boolean }[] = [];

  models.push({ id: 'samba:DeepSeek-V3.2', name: 'DeepSeek V3.2', tag: 'SambaNova · Reasoning', vision: false });
  models.push({ id: 'samba:Meta-Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', tag: 'SambaNova · Fast', vision: false });
  models.push({ id: 'samba:gemma-4-31B-it', name: 'Gemma 4 Vision', tag: 'SambaNova · Photos', vision: true });

  let free: any[] = [];
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    free = (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
  } catch {}
  const prio = ['deepseek', 'qwen', 'gemma', 'mistral', 'llama', 'step', 'dots'];
  const sorted = [...free].sort((a: any, b: any) => {
    const pa = prio.findIndex(k => a.id.includes(k));
    const pb = prio.findIndex(k => b.id.includes(k));
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });
  const base = (m: any) => (String(m.id).split('/')[1] || m.id).replace(':free', '');
  const isVis = (m: any) => String(m.architecture?.modality || '').includes('image');
  if (sorted[0]) models.push({ id: 'or:' + sorted[0].id, name: base(sorted[0]), tag: 'OpenRouter · Pro', vision: isVis(sorted[0]) });
  const rv = sorted.find((m) => m.id.includes('r1') || m.id.includes('reason'));
  if (rv) models.push({ id: 'or:' + rv.id, name: 'Reasoning', tag: 'OpenRouter · Think', vision: false });

  return NextResponse.json({ models });
}

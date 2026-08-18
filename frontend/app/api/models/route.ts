import { NextResponse } from 'next/server';

export async function GET() {
  let free: any[] = [];
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models');
    const j = await r.json();
    free = (j.data || []).filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'));
  } catch {}

  const prio = ['deepseek-r1', 'deepseek', 'qwen3-235', 'qwen', 'gemma-4-26', 'gemma', 'nemotron', 'mistral', 'llama'];
  const sorted = [...free].sort((a: any, b: any) => {
    const pa = prio.findIndex(k => a.id.includes(k));
    const pb = prio.findIndex(k => b.id.includes(k));
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  const best = sorted[0];
  const models = best
    ? [
        {
          id: 'or:' + best.id,
          name: 'OmniX Pro',
          tag: 'OpenRouter · Best Free',
          vision: String(best.architecture?.modality || '').includes('image'),
        },
      ]
    : [];

  return NextResponse.json({ models });
}

import { NextRequest, NextResponse } from 'next/server';

const MODELS = [
  'black-forest-labs/FLUX.1-schnell',
  'stabilityai/stable-diffusion-xl-base-1.0',
];

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'prompt missing' }, { status: 400 });

  // 1) HuggingFace dedicated image models
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
      });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 1000) continue;
      const b64 = Buffer.from(buf).toString('base64');
      return NextResponse.json({ image: `data:image/png;base64,${b64}` });
    } catch {}
  }

  // 2) Pollinations fallback (free, no key)
  try {
    const pr = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true`
    );
    if (pr.ok) {
      const buf = await pr.arrayBuffer();
      if (buf.byteLength > 1000) {
        const b64 = Buffer.from(buf).toString('base64');
        return NextResponse.json({ image: `data:image/jpeg;base64,${b64}` });
      }
    }
  } catch {}

  return NextResponse.json({ error: 'Image service busy - dobara try karein' });
}

import { NextRequest, NextResponse } from 'next/server';
import { getGithubToken } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const token = await getGithubToken();
  if (!token) return NextResponse.json({ error: 'not connected' }, { status: 401 });

  const { repo, path, content, message } = await req.json();
  if (!repo || !path || !content) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const H = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'OmniX',
    Accept: 'application/vnd.github+json',
  };

  try {
    let sha: string | undefined;
    const cur = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: H });
    if (cur.ok) {
      const cj = await cur.json();
      sha = cj.sha;
    }

    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || `OmniX AI update: ${path}`,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        ...(sha ? { sha } : {}),
      }),
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ error: j.message || 'commit failed' }, { status: r.status });

    return NextResponse.json({ ok: true, html: j.content?.html_url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

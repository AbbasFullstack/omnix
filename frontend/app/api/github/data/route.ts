import { NextRequest, NextResponse } from 'next/server';
import { getGithubToken } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const token = await getGithubToken();
  if (!token) return NextResponse.json({ error: 'not connected' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type');
  const repo = req.nextUrl.searchParams.get('repo');
  const path = req.nextUrl.searchParams.get('path');
  const H = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'OmniX',
    Accept: 'application/vnd.github+json',
  };

  try {
    if (type === 'repos') {
      const r = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', { headers: H });
      return NextResponse.json(await r.json());
    }
    if (type === 'tree' && repo) {
      const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { headers: H });
      const j = await r.json();
      const files = (j.tree || []).filter((t: any) => t.type === 'blob').slice(0, 100).map((t: any) => t.path);
      return NextResponse.json({ files });
    }
    if (type === 'file' && repo && path) {
      const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: H });
      const j = await r.json();
      const content = Buffer.from(j.content || '', 'base64').toString('utf-8');
      return NextResponse.json({ content });
    }
    return NextResponse.json({ error: 'bad type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

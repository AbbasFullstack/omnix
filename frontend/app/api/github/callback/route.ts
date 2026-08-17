import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getSupabaseUser } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const saved = req.cookies.get('gh_state')?.value;

  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0];
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const home = `${proto}://${host}`;

  if (!code || !state || state !== saved) {
    return NextResponse.redirect(home + '/?gh=error');
  }

  const user = await getSupabaseUser();
  if (!user) return NextResponse.redirect(home + '/?gh=login');

  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const j = await r.json();
  if (!j.access_token) return NextResponse.redirect(home + '/?gh=error');

  const ur = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${j.access_token}`, 'User-Agent': 'OmniX' },
  });
  const uj = await ur.json();

  const supabase = await getSupabase();
  await supabase
    .from('user_github')
    .upsert({ user_id: user.id, access_token: j.access_token, login: uj.login });

  const res = NextResponse.redirect(home + '/?gh=connected');
  res.cookies.set('gh_state', '', { maxAge: 0, path: '/' });
  return res;
}

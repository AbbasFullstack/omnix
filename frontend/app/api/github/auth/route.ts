import { NextResponse } from 'next/server';

export async function GET() {
  const state = Math.random().toString(36).slice(2);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID || '');
  url.searchParams.set('scope', 'repo');
  url.searchParams.set('state', state);
  const res = NextResponse.redirect(url);
  res.cookies.set('gh_state', state, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600, path: '/' });
  return res;
}

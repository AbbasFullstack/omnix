import { NextResponse } from 'next/server';

export async function GET() {
  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const redirectUri = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'https://omnix-pi.vercel.app'}/api/github/callback`
  );
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=repo&response_type=code`;
  
  return NextResponse.redirect(authUrl);
}

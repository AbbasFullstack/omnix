import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function getSupabaseUser() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getGithubToken(): Promise<string | null> {
  const user = await getSupabaseUser();
  if (!user) return null;
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('user_github')
    .select('access_token')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.access_token || null;
}

export async function getMemories(): Promise<string[]> {
  const user = await getSupabaseUser();
  if (!user) return [];
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('memory')
    .select('fact')
    .eq('user_id', user.id)
    .limit(20);
  return (data || []).map((m: any) => m.fact);
}

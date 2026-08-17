import { NextResponse } from 'next/server';
import { getSupabase, getSupabaseUser } from '@/lib/supabase-server';

export async function GET() {
  const user = await getSupabaseUser();
  if (!user) return NextResponse.json({ connected: false });
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('user_github')
    .select('login')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, login: data.login });
}

export async function DELETE() {
  const user = await getSupabaseUser();
  if (!user) return NextResponse.json({ ok: true });
  const supabase = await getSupabase();
  await supabase.from('user_github').delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}

'use client';

import { useState } from 'react';
import { Zap, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || password.length < 6) {
      alert('Email aur kam az kam 6 character password likhein');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = '/';
    setLoading(false);
  };

  const signup = async () => {
    if (!email || password.length < 6) {
      alert('Email aur kam az kam 6 character password likhein');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('✅ Account ban gaya! Ab Login button dabayein.');
    setLoading(false);
  };

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/10 rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <a href="/" className="p-2 rounded-lg bg-white/5 border border-white/10">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </a>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-2">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <p className="text-lg font-bold">OmniX</p>
        <p className="text-[10px] text-white/40 -mt-2">All-in-One Personal AI</p>
        
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
        />
        <button
          onClick={login}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold disabled:opacity-50"
        >
          Login
        </button>
        <button
          onClick={loginGoogle}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold disabled:opacity-50"
        >
          Google se login
        </button>
        <button
          onClick={signup}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-white/5 border border-orange-500/30 text-sm font-bold text-orange-300 disabled:opacity-50"
        >
          Naya Account (Sign Up)
        </button>
        <p className="text-[8px] text-white/30 text-center pt-2">
          Made by Abbas Hussain · 16-year-old self-taught developer 🇵🇰
        </p>
      </div>
    </div>
  );
}

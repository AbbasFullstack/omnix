'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Zap, Send, Image as ImageIcon, X, GitBranch, LogOut, Mic, History, Plus,
  Brain, Volume2, VolumeX, Palette, Phone, Presentation, Clapperboard,
  Menu, Settings, Info, ChevronLeft, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Msg = { role: 'user' | 'ai'; text: string; image?: string; model?: string };

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [models, setModels] = useState<any[]>([{ id: 'or:auto', name: 'OmniX Pro', tag: 'OpenRouter · Best Free', vision: true }]);
  const [activeModel, setActiveModel] = useState<any>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<'menu' | 'settings' | 'about'>('menu');
  const [plusOpen, setPlusOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const [memoryList, setMemoryList] = useState<any[]>([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [speakOn, setSpeakOn] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [imageMode, setImageMode] = useState(false);

  const [githubRow, setGithubRow] = useState<any>(null);
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);
  useEffect(() => { setSpeakOn(localStorage.getItem('omnix_tts') === '1'); }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthLoading(false);
      if (data.session?.user) loadGithub(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
      if (session?.user) loadGithub(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetch('/api/models').then(r => r.json()).then(j => {
      if (j.models?.length) { setModels(j.models); setActiveModel(j.models[0]); }
    }).catch(() => {});
    loadHistory();
  }, []);

  const loadGithub = async (uid: string) => {
    const { data } = await supabase.from('user_github').select('*').eq('user_id', uid).maybeSingle();
    setGithubRow(data);
  };

  const connectGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo',
        redirectTo: window.location.origin,
      },
    });
    if (error) alert('GitHub connect error: ' + error.message);
  };

  const disconnectGithub = async () => {
    await supabase.from('user_github').delete().eq('user_id', user.id);
    setGithubRow(null);
    alert('✅ GitHub disconnected!');
  };

  const loadHistory = async () => {
    const { data } = await supabase.from('chats').select('*').order('created_at', { ascending: false }).limit(20);
    setHistoryList(data || []);
  };

  const openChat = (row: any) => {
    setMessages(row.messages || []);
    setDrawerOpen(false);
  };

  const saveChat = async (finalMsgs: Msg[], q: string) => {
    const clean = finalMsgs.map(m => ({ role: m.role, text: m.text }));
    const { data: last } = await supabase.from('chats').select('id').order('created_at', { ascending: false }).limit(1);
    if (last?.[0]) {
      await supabase.from('chats').update({ messages: clean }).eq('id', last[0].id);
    } else {
      await supabase.from('chats').insert({ user_id: user.id, title: q.slice(0, 40), messages: clean });
    }
    loadHistory();
  };

  const cleanThink = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const speak = (text: string, id?: number) => {
    try {
      const clean = text.replace(/[*#`_]/g, '').slice(0, 500);
      const u = new SpeechSynthesisUtterance(clean);
      (window as any).__omnix_u = u;
      u.lang = 'en-US';
      u.onstart = () => setSpeakingId(id ?? -1);
      u.onend = () => setSpeakingId(null);
      u.onerror = () => setSpeakingId(null);
      speechSynthesis.speak(u);
    } catch {}
  };

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ur-PK';
    rec.interimResults = false;
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    try { rec.start(); } catch {}
  };

  const pickImage = (f: File) => {
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(f);
  };

  const send = async () => {
    const q = input.trim();
    if ((!q && !image) || loading) return;

    if (imageMode) {
      setMessages(m => [...m, { role: 'user', text: '🎨 ' + q }]);
      setInput('');
      setLoading(true);
      try {
        const res = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: q }) });
        const j = await res.json();
        if (j.image) setMessages(m => [...m, { role: 'ai', text: '🎨 ' + q, image: j.image, model: 'FLUX' }]);
        else setMessages(m => [...m, { role: 'ai', text: '⚠️ ' + (j.error || 'Image fail') }]);
      } catch {
        setMessages(m => [...m, { role: 'ai', text: '⚠️ Network error' }]);
      }
      setLoading(false);
      return;
    }

    setMessages(m => [...m, { role: 'user', text: q, image: image || undefined }]);
    setInput('');
    setImage('');
    setLoading(true);
    setStreaming(true);
    setMessages(m => [...m, { role: 'ai', text: '' }]);
    let finalAi = '';
    if (speakOn) {
      try {
        const warm = new SpeechSynthesisUtterance(' ');
        warm.volume = 0;
        speechSynthesis.speak(warm);
      } catch {}
    }
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messagesRef.current, { role: 'user', text: q }],
          modelId: activeModel?.id,
          image: image || undefined,
          stream: true,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        finalAi = cleanThink(j.reply || '');
        setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: finalAi, model: j.used ? String(j.used).split('/').pop() : activeModel?.name }; return c; });
      } else {
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let aiText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const s = line.trim();
            if (!s.startsWith('data: ')) continue;
            const d = s.slice(6);
            if (d === '[DONE]') continue;
            try {
              const j = JSON.parse(d);
              if (j.used) {
                setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], model: String(j.used).split('/').pop() }; return c; });
              }
              if (j.delta) {
                aiText += j.delta;
                finalAi = cleanThink(aiText);
                setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: finalAi }; return c; });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: '⚠️ Network error' }; return c; });
    }
    if (speakOn && finalAi) speak(finalAi);
    await saveChat([...messagesRef.current, { role: 'ai', text: finalAi }], q);
    setLoading(false);
    setStreaming(false);
  };

  const addMemory = async () => {
    const f = memoryInput.trim();
    if (!f) return;
    await supabase.from('memory').insert({ user_id: user.id, fact: f });
    setMemoryInput('');
    refreshMemory();
  };

  const refreshMemory = async () => {
    const { data } = await supabase.from('memory').select('id,fact').eq('user_id', user?.id).limit(20);
    setMemoryList(data || []);
  };

  const delMemory = async (id: string) => {
    await supabase.from('memory').delete().eq('id', id);
    setMemoryList(memoryList.filter(m => m.id !== id));
  };

  const changePass = async () => {
    if (newPass.length < 6) return alert('Password kam az kam 6 characters');
    if (newPass !== newPass2) return alert('Passwords match nahi karte');
    const { error } = await supabase.auth.updateUser({ password: newPass });
    alert(error ? 'Error: ' + error.message : '✅ Password change ho gaya!');
    if (!error) { setNewPass(''); setNewPass2(''); }
  };

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) alert(error.message);
  };

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  if (authLoading)
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center"><Zap className="w-8 h-8 text-orange-500 animate-pulse" /></div>;

  if (!user)
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white/[0.04] border border-white/10 rounded-3xl p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-2">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <p className="text-lg font-bold">OmniX</p>
          <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50" />
          <input value={loginPass} onChange={e => setLoginPass(e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50" />
          <button onClick={login} className="w-full py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold">Login</button>
          <button onClick={loginGoogle} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold">Google se login</button>
        </div>
      </div>
    );

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <header className="border-b border-white/[0.06] bg-[#0d0d0d]">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => { setDrawerOpen(true); setDrawerView('menu'); refreshMemory(); }} className="p-2 rounded-lg bg-white/5 border border-white/10">
            <Menu className="w-4 h-4 text-white/70" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">OmniX</p>
            <p className="text-[9px] text-white/40 leading-tight truncate">All-in-One Personal AI</p>
          </div>
          {githubRow && (
            <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold flex items-center gap-1 max-w-[110px] truncate">
              <GitBranch className="w-3 h-3 shrink-0" /> {githubRow.login}
            </span>
          )}
          <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-lg bg-white/5 border border-white/10">
            <LogOut className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-2.5">
          {models.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModel(m)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-left transition ${activeModel?.id === m.id ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/[0.03] border-white/[0.07]'}`}
            >
              <p className={`text-[10px] font-bold ${activeModel?.id === m.id ? 'text-orange-300' : 'text-white/70'}`}>{m.name}</p>
              <p className="text-[8px] text-white/35">{m.tag}</p>
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center pt-16">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm text-white/60">Assalam-o-Alaikum Abbas! Main OmniX hoon </p>
              <p className="text-[10px] text-white/35 mt-1">+ button se features kholein, ya seedha poochein</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-orange-600/20 border border-orange-500/30 rounded-br-md' : 'bg-white/[0.04] border border-white/[0.07] rounded-tl-md'}`}>
                {m.image && <img src={m.image} alt="" className="w-full max-h-72 object-contain rounded-xl mb-2 border border-orange-500/30" />}
                {m.text}
                {m.role === 'ai' && m.model && <p className="text-[8px] text-orange-400/70 mt-2 uppercase font-bold">{m.model}</p>}
                {m.role === 'ai' && m.image && (
                  <a href={m.image} download="omnix-image.png" className="mt-2 inline-flex items-center gap-1 text-[9px] text-orange-300 border border-orange-500/30 rounded-lg px-2 py-1">️ Download</a>
                )}
                {m.role === 'ai' && !streaming && m.text && (
                  <button onClick={() => (speakingId === i ? speechSynthesis.cancel() : speak(m.text, i))} className="mt-2 flex items-center gap-1 text-[9px] text-white/40">
                    <Volume2 className="w-3 h-3" /> {speakingId === i ? '⏹ Stop' : 'Suno'}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-[#0d0d0d] p-3">
        <div className="max-w-3xl mx-auto">
          {image && (
            <div className="relative inline-block mb-2">
              <img src={image} alt="" className="h-16 rounded-xl border border-orange-500/40" />
              <button onClick={() => setImage('')} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"><X className="w-3 h-3" /></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setPlusOpen(true)} className="p-3 rounded-xl bg-white/5 border border-white/10 shrink-0">
              <Plus className="w-4 h-4 text-orange-400" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={imageMode ? '🎨 Image prompt likhein...' : 'OmniX se kuch poochein...'}
              className={`flex-1 min-w-0 px-4 py-3 bg-white/5 border rounded-xl text-sm focus:outline-none focus:border-orange-500/50 ${imageMode ? 'border-orange-500/40' : 'border-white/10'}`}
            />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && pickImage(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} className="p-3 rounded-xl bg-white/5 border border-white/10 shrink-0">
              <ImageIcon className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={toggleVoice} className="p-3 rounded-xl bg-white/5 border border-white/10 shrink-0">
              <Mic className="w-4 h-4 text-white/60" />
            </button>
            <button onClick={send} disabled={loading} className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shrink-0 disabled:opacity-50">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[8px] text-white/30 text-center mt-2">OmniX - Abbas Hussain ka personal AI workspace</p>
        </div>
      </div>

      {plusOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end" onClick={() => setPlusOpen(false)}>
          <div className="w-full bg-[#151515] border-t border-white/10 rounded-t-3xl p-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 mx-auto mb-4 rounded-full bg-white/20" />
            <div className="grid grid-cols-2 gap-3">
              <a href="/video" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <Clapperboard className="w-5 h-5 mx-auto mb-2 text-pink-400" />
                <p className="text-[11px] font-bold">Create Video</p>
              </a>
              <a href="/slides" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <Presentation className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
                <p className="text-[11px] font-bold">Create Slides</p>
              </a>
              <a href="/call" className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <Phone className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                <p className="text-[11px] font-bold">Voice Call</p>
              </a>
              <button onClick={() => { setImageMode(!imageMode); setPlusOpen(false); }} className={`p-4 rounded-2xl border text-center ${imageMode ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10'}`}>
                <Palette className="w-5 h-5 mx-auto mb-2 text-orange-400" />
                <p className="text-[11px] font-bold">Image Mode {imageMode ? 'ON' : 'OFF'}</p>
              </button>
              {githubRow ? (
                <button onClick={disconnectGithub} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-center col-span-2">
                  <GitBranch className="w-5 h-5 mx-auto mb-2 text-red-400" />
                  <p className="text-[11px] font-bold text-red-300">Disconnect GitHub ({githubRow.login})</p>
                </button>
              ) : (
                <button onClick={connectGithub} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center col-span-2">
                  <GitBranch className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                  <p className="text-[11px] font-bold">Connect GitHub</p>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex" onClick={() => setDrawerOpen(false)}>
          <div className="w-80 max-w-[85%] h-full bg-[#111111] border-r border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
              {drawerView !== 'menu' && (
                <button onClick={() => setDrawerView('menu')} className="p-2 rounded-lg bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
              )}
              <p className="text-sm font-bold">{drawerView === 'menu' ? '☰ Menu' : drawerView === 'settings' ? '⚙️ Settings' : 'ℹ️ About OmniX'}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {drawerView === 'menu' && (
                <>
                  <button onClick={() => { setMessages([]); setDrawerOpen(false); }} className="w-full py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold">+ New Chat</button>
                  <p className="text-[9px] text-white/40 font-bold uppercase pt-2 flex items-center gap-1"><History className="w-3 h-3" /> Chat History</p>
                  {historyList.map(h => (
                    <button key={h.id} onClick={() => openChat(h)} className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[11px] font-bold truncate">{h.title || 'Chat'}</p>
                      <p className="text-[8px] text-white/35">{(h.messages || []).length} messages · {new Date(h.created_at).toLocaleDateString()}</p>
                    </button>
                  ))}
                  {historyList.length === 0 && <p className="text-[10px] text-white/30 text-center py-3">Koi purani chat nahi</p>}
                  <button onClick={() => setDrawerView('settings')} className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-left text-[11px] font-bold flex items-center gap-2">
                    <Settings className="w-4 h-4 text-white/50" /> Settings
                  </button>
                  <button onClick={() => setDrawerView('about')} className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-left text-[11px] font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-white/50" /> About OmniX
                  </button>
                </>
              )}
              {drawerView === 'settings' && (
                <>
                  <p className="text-[9px] text-orange-300 font-bold flex items-center gap-1"><Brain className="w-3 h-3" /> Personal Brain (Memory)</p>
                  <div className="flex gap-2">
                    <input value={memoryInput} onChange={e => setMemoryInput(e.target.value)} placeholder="jaise: mujhe black color pasand hai" className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] focus:outline-none" />
                    <button onClick={addMemory} className="px-3 rounded-xl bg-orange-600 text-[10px] font-bold">Add</button>
                  </div>
                  {memoryList.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 text-[10px]">
                      <span>{m.fact}</span>
                      <button onClick={() => delMemory(m.id)}><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                  ))}
                  <button onClick={() => { const n = !speakOn; setSpeakOn(n); localStorage.setItem('omnix_tts', n ? '1' : '0'); }} className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-left text-[11px] font-bold flex items-center gap-2">
                    {speakOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-white/50" />}
                    Auto Voice Reply: {speakOn ? 'ON' : 'OFF'}
                  </button>
                  <p className="text-[9px] text-white/40 font-bold uppercase pt-2">Password Change</p>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} type="password" placeholder="Naya password" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] focus:outline-none" />
                  <input value={newPass2} onChange={e => setNewPass2(e.target.value)} type="password" placeholder="Dobara likhein" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] focus:outline-none" />
                  <button onClick={changePass} className="w-full py-2.5 rounded-xl bg-white/10 text-[10px] font-bold">Save Password</button>
                </>
              )}
              {drawerView === 'about' && (
                <div className="space-y-3 text-[11px] leading-relaxed text-white/70">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-sm font-bold text-white">OmniX v2.0</p>
                  <p>All-in-One Personal AI Assistant — chat, voice call, image generation, slides, video, vision, memory aur chat history, sab aik hi jagah.</p>
                  <p><span className="text-orange-300 font-bold">Developer:</span> Abbas Hussain — 16-year-old self-taught developer from Pakistan 🇵🇰</p>
                  <p><span className="text-orange-300 font-bold">Tech:</span> Next.js, TypeScript, Tailwind, Supabase (Auth + RLS), OpenRouter backbone, HuggingFace FLUX</p>
                  <p><span className="text-orange-300 font-bold">Features:</span> Streaming chat · Voice input · Voice call · Vision · Image gen · Slides · Video gen · Personal memory · Chat history · GitHub connect</p>
                  <p className="text-[9px] text-white/35">Made with  and pure curiosity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

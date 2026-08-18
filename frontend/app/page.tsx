'use client';
import { useEffect, useRef, useState } from 'react';
import { Zap, Send, Cpu, Image as ImageIcon, X, GitBranch, LogOut, Mic, History, Plus, Brain, Volume2, VolumeX, Palette, Phone, PhoneOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Msg {
  role: 'user' | 'ai';
  text: string;
  model?: string;
  image?: string;
}

interface ModelOpt {
  id: string;
  name: string;
  tag: string;
  vision: boolean;
}

const DEFAULT_MODELS: ModelOpt[] = [
  { id: 'groq:llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Groq · Fast', vision: false },
  { id: 'groq:llama-3.1-8b-instant', name: 'Llama 3.1 8B', tag: 'Groq · Instant', vision: false },
];

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: 'Assalam-o-Alaikum Abbas! Main OmniX hoon ⚡ - model chunein, photo attach karein, aur shuru karein!' },
  ]);
  const [models, setModels] = useState<ModelOpt[]>(DEFAULT_MODELS);
  const [modelId, setModelId] = useState(DEFAULT_MODELS[0].id);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryList, setMemoryList] = useState<any[]>([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [speakOn, setSpeakOn] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callTranscript, setCallTranscript] = useState<{ who: string; text: string }[]>([]);
  const [callStatus, setCallStatus] = useState('listening');
  const callActive = useRef(false);
  const callBusy = useRef(false);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [showRepo, setShowRepo] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoLoading, setRepoLoading] = useState(false);
  const [ghUser, setGhUser] = useState<any>(null);
  const [ghPanel, setGhPanel] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [repoSel, setRepoSel] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [commitPrompt, setCommitPrompt] = useState('');
  const [committing, setCommitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeModel = models.find(m => m.id === modelId) || models[0];

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(j => {
        if (j.models?.length) setModels(j.models);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('gh')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      const r = await fetch('/api/github/session');
      const j = await r.json();
      if (j.connected) setGhUser(j);
    })();
  }, []);

  useEffect(() => {
    let unsub: any = null;
    supabase.auth.getSession().then(({ data }: any) => setUser(data.session?.user || null));
    const sub = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user || null);
    });
    unsub = sub && sub.data ? sub.data.subscription : null;
    return () => {
      if (unsub) unsub.unsubscribe();
    };
  }, []);

  const doAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    const { error } = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Photo ko chota karke base64 banayein
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 768 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const importRepo = async () => {
    const m = repoUrl.match(/github\.com\/([^\/\?]+)\/([^\/\?#]+)/);
    if (!m) {
      setMessages(ms => [...ms, { role: 'ai', text: '⚠️ Sahi GitHub repo URL paste karein (jaise https://github.com/user/repo)' }]);
      return;
    }
    const [, owner, repo] = m;
    setRepoLoading(true);
    try {
      const base = `https://api.github.com/repos/${owner}/${repo}`;
      const [metaR, readmeR, filesR] = await Promise.all([
        fetch(base),
        fetch(`${base}/readme`),
        fetch(`${base}/contents/`),
      ]);
      const meta = await metaR.json();
      let readme = '';
      if (readmeR.ok) {
        const rd = await readmeR.json();
        try {
          readme = decodeURIComponent(escape(atob(rd.content || '')));
        } catch {}
      }
      let files = '';
      if (filesR.ok) {
        const fl = await filesR.json();
        files = (fl || []).slice(0, 20).map((f: any) => f.path).join(', ');
      }
      const context =
        `REPO: ${owner}/${repo}\n` +
        `Description: ${meta.description || 'N/A'}\n` +
        `Stars: ${meta.stargazers_count} | Language: ${meta.language} | Topics: ${(meta.topics || []).join(', ')}\n` +
        `Files: ${files}\n` +
        `README:\n${readme.slice(0, 6000)}`;
      setShowRepo(false);
      setRepoUrl('');
      await send(`📂 Repo import: ${owner}/${repo}\n\n${context}\n\nIs repo ko detail mein explain karein - kya karta hai, tech stack, aur code quality kaisi hai?`);
    } catch {
      setMessages(ms => [...ms, { role: 'ai', text: '⚠️ Repo fetch nahi hui - URL check karein (public repo honi chahiye)' }]);
    }
    setRepoLoading(false);
  };

  const speakText = (text: string, onEnd: () => void) => {
    const clean = text.replace(/[*#`_]/g, '').slice(0, 300);
    const urls = [
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&text=' + encodeURIComponent(clean),
      'https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=' + encodeURIComponent(clean),
    ];
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) {
        try {
          const u = new SpeechSynthesisUtterance(clean);
          (window as any).__omnix_u = u;
          u.onend = onEnd;
          u.onerror = onEnd;
          speechSynthesis.speak(u);
        } catch {
          onEnd();
        }
        return;
      }
      const a = new Audio(urls[i]);
      i++;
      a.onended = onEnd;
      a.onerror = tryNext;
      a.play().catch(tryNext);
    };
    tryNext();
  };

  const startCallListen = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ur-PK';
    rec.interimResults = false;
    setCallStatus('listening');
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setCallTranscript(m => [...m, { who: 'user', text: t }]);
      setCallStatus('thinking');
      (async () => {
        callBusy.current = true;
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...messagesRef.current, { role: 'user', text: t }],
              modelId: activeModel.id,
              stream: false,
            }),
          });
          const j = await res.json();
          setCallTranscript(m => [...m, { who: 'ai', text: j.reply }]);
          setMessages(m => [...m, { role: 'user', text: t }, { role: 'ai', text: j.reply, model: 'Call' }]);
          setCallStatus('speaking');
          speakText(j.reply, () => {
            callBusy.current = false;
            if (callActive.current) setCallStatus('tap');
          });
        } catch {
          callBusy.current = false;
          if (callActive.current) setCallStatus('tap');
        }
      })();
    };
    rec.onend = () => {
      if (callActive.current && !callBusy.current) setCallStatus('tap');
    };
    rec.onerror = (e: any) => {
      setCallTranscript(m => [...m, { who: 'ai', text: '⚠️ Mic: ' + (e.error || 'error') }]);
      setCallStatus('tap');
    };
    try {
      rec.start();
    } catch {}
  };

  const startCall = () => {
    callActive.current = true;
    setInCall(true);
    setCallTranscript([]);
    setCallStatus('speaking');
    speakText('Ji boliye, main sun raha hoon', () => {
      setCallStatus('tap');
    });
  };

  const endCall = () => {
    callActive.current = false;
    setInCall(false);
  };

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages(m => [...m, { role: 'ai', text: '⚠️ Is browser mein voice support nahi hai' }]);
      return;
    }
    if (listening) return;
    const rec = new SR();
    rec.lang = 'ur-PK';
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let t = '';
      for (const r of e.results) t += r[0].transcript;
      setInput(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  useEffect(() => {
    setSpeakOn(localStorage.getItem('omnix_tts') === '1');
  }, []);

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

  const cleanThink = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  const toggleSpeak = () => {
    const next = !speakOn;
    setSpeakOn(next);
    localStorage.setItem('omnix_tts', next ? '1' : '0');
    if (!next) speechSynthesis.cancel();
  };

  const loadMemory = async () => {
    if (!memoryOpen) {
      const { data } = await supabase.from('memory').select('id,fact').eq('user_id', user?.id).limit(20);
      setMemoryList(data || []);
    }
    setMemoryOpen(!memoryOpen);
  };

  const addMemory = async () => {
    const f = memoryInput.trim();
    if (!f) return;
    await supabase.from('memory').insert({ user_id: user.id, fact: f });
    setMemoryInput('');
    const { data } = await supabase.from('memory').select('id,fact').eq('user_id', user.id).limit(20);
    setMemoryList(data || []);
  };

  const delMemory = async (id: string) => {
    await supabase.from('memory').delete().eq('id', id);
    setMemoryList(memoryList.filter((m: any) => m.id !== id));
  };

  const saveChat = async (finalMsgs: Msg[], q: string) => {
    try {
      const clean = finalMsgs.map((m) => ({ role: m.role, text: m.text, model: m.model }));
      if (chatId) {
        await supabase.from('chats').update({ messages: clean }).eq('id', chatId);
      } else {
        const { data } = await supabase
          .from('chats')
          .insert({ user_id: user.id, title: q.slice(0, 40), messages: clean })
          .select()
          .single();
        if (data) setChatId(data.id);
      }
    } catch {}
  };

  const loadHistory = async () => {
    if (!historyOpen) {
      const { data } = await supabase
        .from('chats')
        .select('id,title,created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      setHistoryList(data || []);
    }
    setHistoryOpen(!historyOpen);
  };

  const openChat = (h: any) => {
    supabase.from('chats').select('messages').eq('id', h.id).single().then(({ data }: any) => {
      if (data) {
        setMessages(data.messages || []);
        setChatId(h.id);
        setHistoryOpen(false);
      }
    });
  };

  const newChat = () => {
    setMessages([{ role: 'ai', text: 'Assalam-o-Alaikum Abbas! Main OmniX hoon ⚡ - model chunein, photo attach karein, aur shuru karein!' }]);
    setChatId(null);
    setHistoryOpen(false);
  };

  const connectGh = () => {
    window.location.href = '/api/github/auth';
  };

  const disconnectGh = async () => {
    await fetch('/api/github/session', { method: 'DELETE' });
    setGhUser(null);
    setRepos([]);
    setFiles([]);
    setRepoSel('');
  };

  const loadRepos = async () => {
    setGhLoading(true);
    setRepoSel('');
    setFiles([]);
    try {
      const r = await fetch('/api/github/data?type=repos');
      const j = await r.json();
      setRepos(Array.isArray(j) ? j : []);
    } catch {}
    setGhLoading(false);
  };

  const generateCommit = async () => {
    if (!filePath.trim() || !commitPrompt.trim() || committing) return;
    setCommitting(true);
    setMessages(m => [...m, { role: 'user', text: `🛠️ [${repoSel}] ${filePath}: ${commitPrompt}` }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', text: commitPrompt + ' - ONLY output the complete file code, no explanations, no markdown fences.' }],
          modelId: 'groq:llama-3.3-70b-versatile',
        }),
      });
      const j = await res.json();
      let code = String(j.reply || '');
      code = code.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
      const cr = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoSel,
          path: filePath.trim(),
          content: code,
          message: `OmniX AI: ${commitPrompt.slice(0, 60)}`,
        }),
      });
      const cj = await cr.json();
      if (cj.ok) {
        setMessages(m => [...m, { role: 'ai', text: `✅ Commit successful! File: ${filePath}\n🔗 ${cj.html}`, model: 'omnix-writer' }]);
        setCommitPrompt('');
      } else {
        setMessages(m => [...m, { role: 'ai', text: '⚠️ Commit error: ' + (cj.error || 'unknown') }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠️ Network error' }]);
    }
    setCommitting(false);
  };

  const openRepo = async (full: string) => {
    setRepoSel(full);
    setGhLoading(true);
    try {
      const r = await fetch(`/api/github/data?type=tree&repo=${full}`);
      const j = await r.json();
      setFiles(j.files || []);
    } catch {}
    setGhLoading(false);
  };



  const openFile = async (path: string) => {
    setGhLoading(true);
    try {
      const r = await fetch(`/api/github/data?type=file&repo=${repoSel}&path=${encodeURIComponent(path)}`);
      const j = await r.json();
      await send(`📂 [${repoSel}] ${path}\n\n${(j.content || '').slice(0, 8000)}\n\nIs file ko explain karein aur behtar banane ke suggestions dein.`);
    } catch {
      setMessages(ms => [...ms, { role: 'ai', text: '⚠️ File load nahi hui' }]);
    }
    setGhLoading(false);
  };



  const send = async (text?: string) => {
    const q = (text || input).trim();
    if ((!q && !image) || loading) return;

    if (imageMode) {
      setMessages(m => [...m, { role: 'user', text: '🎨 ' + q }]);
      setInput('');
      setLoading(true);
      try {
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: q }),
        });
        const j = await res.json();
        if (j.image) {
          setMessages(m => [...m, { role: 'ai', text: '🎨 ' + q, image: j.image, model: 'FLUX' }]);
        } else {
          setMessages(m => [...m, { role: 'ai', text: '⚠️ ' + (j.error || 'Image fail') }]);
        }
      } catch {
        setMessages(m => [...m, { role: 'ai', text: '⚠️ Network error' }]);
      }
      setLoading(false);
      return;
    }

    setInput('');
    const question = q || 'Is photo ko analyze karein';
    setMessages(m => [...m, { role: 'user', text: question, image: image || undefined }]);
    setLoading(true);
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
          messages: [...messages, { role: 'user', text: question }],
          modelId: activeModel.id,
          image,
          stream: true,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        finalAi = cleanThink(json.reply);
        setMessages(m => [...m, { role: 'ai', text: finalAi, model: json.used ? String(json.used).split('/').pop() : activeModel.name }]);
      } else {
        setStreaming(true);
        setMessages(m => [...m, { role: 'ai', text: '', model: activeModel.name }]);
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
            const s2 = line.trim();
            if (!s2.startsWith('data: ')) continue;
            const d = s2.slice(6);
            if (d === '[DONE]') continue;
            try {
              const j = JSON.parse(d);
              if (j.used) {
                const name = String(j.used).split('/').pop();
                setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], model: name }; return c; });
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
      if (speakOn && finalAi) speak(finalAi);
      await saveChat([...messages, { role: 'user', text: question }, { role: 'ai', text: finalAi }], question);
      setImage(null);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠️ Network error - dobara try karein.' }]);
    }
    setStreaming(false);
    setLoading(false);
  };

  if (!user) {
    return (
      <main className="h-screen bg-[#0a0a0a] text-white flex items-center justify-center relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/[0.08] blur-[130px] rounded-full" />
        </div>
        <div className="relative z-10 w-full max-w-sm px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">OmniX</h1>
              <p className="text-[10px] text-white/40">All-in-One Personal AI</p>
            </div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-3 backdrop-blur-xl">
            <p className="text-sm font-bold text-center">{authMode === 'login' ? 'Wapas khush amdeed!' : 'Account banayein'}</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doAuth()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
            />
            {authError && <p className="text-[10px] text-red-400">{authError}</p>}
            <button
              onClick={doAuth}
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold disabled:opacity-40"
            >
              {authLoading ? '...' : authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="w-full text-[11px] text-white/40 hover:text-orange-300 transition"
            >
              {authMode === 'login' ? 'Naya account? Sign Up karein' : 'Pehle se account? Login karein'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-[#0a0a0a] text-white flex flex-col relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/[0.06] blur-[130px] rounded-full" />
        <div className="absolute bottom-0 -right-40 w-[400px] h-[300px] bg-red-600/[0.05] blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-sm">OmniX</h1>
              <p className="text-[10px] text-white/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                All-in-One Personal AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => (ghUser ? setGhPanel(!ghPanel) : connectGh())}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition ${
                ghUser ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.04] border-white/[0.08] text-white/50'
              }`}
            >
              <GitBranch className="w-3 h-3" /> {ghUser ? ghUser.login : 'Connect'}
            </button>
            <button
              onClick={startCall}
              className="px-2.5 py-1.5 rounded-lg border bg-emerald-500/10 border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5"
              title="Voice Call"
            >
              <Phone className="w-3 h-3" />
            </button>
            <button
              onClick={toggleSpeak}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition ${speakOn ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-white/[0.04] border-white/[0.08] text-white/50'}`}
              title="AI awaaz mein bole"
            >
              {speakOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </button>
            <button
              onClick={loadMemory}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition ${memoryOpen ? 'bg-orange-500/10 border-orange-500/40 text-orange-300' : 'bg-white/[0.04] border-white/[0.08] text-white/50'}`}
            >
              <Brain className="w-3 h-3" />
            </button>
            <button
              onClick={loadHistory}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition ${historyOpen ? 'bg-orange-500/10 border-orange-500/40 text-orange-300' : 'bg-white/[0.04] border-white/[0.08] text-white/50'}`}
            >
              <History className="w-3 h-3" />
            </button>
            <button
              onClick={signOut}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-red-400 transition"
              title="Logout"
            >
              <LogOut className="w-3 h-3" />
            </button>
            <span className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-white/50 flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> {models.length} Models
            </span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {models.map(m => (
            <button
              key={m.id}
              onClick={() => setModelId(m.id)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-left transition-all border ${
                m.id === modelId
                  ? 'bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-500/40 shadow-[0_0_20px_-6px_rgba(249,115,22,0.5)]'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
              }`}
            >
              <p className={`text-[11px] font-bold ${m.id === modelId ? 'text-orange-300' : 'text-white/70'}`}>{m.name}</p>
              <p className="text-[9px] text-white/40">{m.tag}</p>
            </button>
          ))}
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {messages.map((m, i) =>
            m.role === 'ai' ? (
              <div key={i} className="flex gap-2.5">
                <div className={`w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 ${streaming && i === messages.length - 1 ? 'animate-pulse shadow-lg shadow-orange-500/50' : ''}`}>
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="max-w-[85%]">
                  {m.model && (
                    <p className="text-[9px] text-orange-400/70 font-bold mb-1 uppercase tracking-wider">{m.model}</p>
                  )}
                  <div className={`px-4 py-3 rounded-2xl rounded-tl-md bg-white/[0.04] border text-sm leading-relaxed whitespace-pre-wrap ${streaming && i === messages.length - 1 ? 'border-orange-500/40 shadow-[0_0_24px_-8px_rgba(249,115,22,0.45)]' : 'border-white/[0.07]'}`}>
                    {m.image && (
                      <img src={m.image} alt="generated" className="w-full max-h-72 object-contain rounded-xl mb-2 border border-orange-500/30" />
                    )}
                    {m.image && m.role === 'ai' && (
                      <a href={m.image} download="omnix-image.png" className="mb-2 inline-flex items-center gap-1 text-[9px] text-orange-300 border border-orange-500/30 rounded-lg px-2 py-1">
                        ⬇️ Download
                      </a>
                    )}
                    {m.text}
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-2 h-4 bg-orange-400 ml-1 align-middle rounded-sm animate-pulse" />
                    )}
                    {!streaming && m.text && (
                      <button
                        onClick={() => (speakingId === i ? speechSynthesis.cancel() : speak(m.text, i))}
                        className="mt-2 flex items-center gap-1 text-[9px] text-white/40 hover:text-orange-300 transition"
                      >
                        <Volume2 className="w-3 h-3" /> {speakingId === i ? '⏹ Stop' : 'Suno'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-md bg-orange-600/15 border border-orange-500/20 text-sm leading-relaxed">
                  {m.image && (
                    <img src={m.image} alt="attached" className="w-full max-h-56 object-contain rounded-xl mb-2 border border-orange-500/30" />
                  )}
                  {m.text}
                </div>
              </div>
            )
          )}
          {loading && !streaming && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-md px-4 py-3">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="relative z-10 border-t border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {inCall && (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex flex-col items-center justify-center p-6">
              <button
                onClick={() => {
                  if (callStatus === 'tap') {
                    setCallStatus('listening');
                    startCallListen();
                  }
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center animate-pulse shadow-2xl shadow-orange-500/40 mb-6"
              >
                {callStatus === 'listening' ? <Mic className="w-10 h-10 text-white" /> : <Phone className="w-10 h-10 text-white" />}
              </button>
              <p className="text-sm font-bold mb-1">OmniX Call</p>
              <p className="text-[10px] text-white/40 mb-6">{callStatus === 'listening' ? '🎤 Sun raha hoon - boliye...' : callStatus === 'thinking' ? '🤔 Soch raha hoon...' : callStatus === 'tap' ? '👆 Circle tap karein aur boliye' : '🔊 Bol raha hoon...'}</p>
              <div className="w-full max-h-48 overflow-y-auto space-y-2 mb-8">
                {callTranscript.map((t, i) => (
                  <div key={i} className={`px-3 py-2 rounded-xl text-xs ${t.who === 'user' ? 'bg-orange-500/20 ml-8' : 'bg-white/10 mr-8'}`}>
                    {t.text}
                  </div>
                ))}
              </div>
              <button onClick={endCall} className="px-6 py-3 rounded-full bg-red-600 text-sm font-bold flex items-center gap-2">
                <PhoneOff className="w-4 h-4" /> Call End
              </button>
            </div>
          )}
          {memoryOpen && (
            <div className="mb-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-orange-300">🧠 Personal Memory - AI yeh sab yaad rakhega</p>
              <div className="flex gap-2">
                <input
                  value={memoryInput}
                  onChange={(e) => setMemoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMemory()}
                  placeholder="jaise: mujhe Roman Urdu pasand hai"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] focus:outline-none focus:border-orange-500/50"
                />
                <button onClick={addMemory} className="px-3 py-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-[10px] font-bold">Add</button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {memoryList.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px]">
                    <span>{m.fact}</span>
                    <button onClick={() => delMemory(m.id)} className="text-red-400 ml-2">✕</button>
                  </div>
                ))}
                {memoryList.length === 0 && <p className="text-[10px] text-white/30 text-center py-2">Koi memory nahi</p>}
              </div>
            </div>
          )}
          {historyOpen && (
            <div className="mb-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-orange-300">💾 Chat History</p>
                <button onClick={newChat} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New Chat
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {historyList.map((h: any) => (
                  <button
                    key={h.id}
                    onClick={() => openChat(h)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs hover:border-orange-500/40"
                  >
                    <p className="font-bold truncate">{h.title || 'Chat'}</p>
                    <p className="text-[9px] text-white/30">{new Date(h.created_at).toLocaleString()}</p>
                  </button>
                ))}
                {historyList.length === 0 && <p className="text-[10px] text-white/30 text-center py-2">Koi purani chat nahi</p>}
              </div>
            </div>
          )}
          {ghPanel && (
            <div className="mb-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-3 space-y-2">
              {!ghUser ? (
                <button
                  onClick={connectGh}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold"
                >
                  🔐 Connect with GitHub (OAuth)
                </button>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-emerald-400">🟢 @{ghUser.login} {ghLoading && '...'}</p>
                    <div className="flex gap-2">
                      <button onClick={loadRepos} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10">My Repos</button>
                      <button onClick={disconnectGh} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-red-400">Disconnect</button>
                    </div>
                  </div>
                  {repos.length > 0 && !repoSel && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {repos.map((r: any) => (
                        <button
                          key={r.full_name}
                          onClick={() => openRepo(r.full_name)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-mono hover:border-orange-500/40"
                        >
                          {r.full_name} {r.private ? '🔒' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                  {repoSel && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-orange-300">{repoSel}</p>
                        <button onClick={() => { setRepoSel(''); setFiles([]); }} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10">← Repos</button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {files.map((f: any) => (
                          <button
                            key={f}
                            onClick={() => openFile(f)}
                            className="w-full text-left px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono hover:border-orange-500/40"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <p className="text-[10px] font-bold text-orange-300">🛠️ AI Writer - code seedha repo mein!</p>
                        <input
                          value={filePath}
                          onChange={(e) => setFilePath(e.target.value)}
                          placeholder="file path (jaise ai-page.html)"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono focus:outline-none focus:border-orange-500/50"
                        />
                        <input
                          value={commitPrompt}
                          onChange={(e) => setCommitPrompt(e.target.value)}
                          placeholder="kya banaye? (jaise: dark landing page)"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] focus:outline-none focus:border-orange-500/50"
                        />
                        <button
                          onClick={generateCommit}
                          disabled={committing}
                          className="w-full py-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold disabled:opacity-40"
                        >
                          {committing ? 'AI likh raha hai...' : '⚡ Generate & Commit'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {showRepo && (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="https://github.com/user/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500/50"
              />
              <button
                onClick={importRepo}
                disabled={repoLoading}
                className="px-3 py-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold disabled:opacity-40"
              >
                {repoLoading ? '...' : 'Import'}
              </button>
            </div>
          )}
          {image && (
            <div className="flex items-center gap-2 mb-2">
              <img src={image} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-orange-500/40" />
              <span className="text-[10px] text-orange-300 font-bold">Photo attached</span>
              <button onClick={() => setImage(null)} className="p-1 rounded bg-white/5 hover:bg-red-500/20 transition">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 focus-within:border-orange-500/50 transition">
            <input
              type="text"
              placeholder={image ? 'Photo ke bare mein poochein...' : `${activeModel.name} se kuch poochein...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="flex-1 bg-transparent py-2 text-sm focus:outline-none placeholder:text-white/30"
            />
            <button
              onClick={() => setImageMode(!imageMode)}
              className={`p-2.5 rounded-xl border transition-all ${imageMode ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10 hover:border-orange-500/40'}`}
              title="AI Image Generation"
            >
              <Palette className={`w-4 h-4 ${imageMode ? 'text-orange-400' : 'text-white/60'}`} />
            </button>
            <button
              onClick={toggleVoice}
              className={`p-2.5 rounded-xl border transition-all ${listening ? 'bg-red-500/20 border-red-500/50 animate-pulse' : 'bg-white/5 border-white/10 hover:border-orange-500/40'}`}
              title="Bol kar poochein"
            >
              <Mic className={`w-4 h-4 ${listening ? 'text-red-400' : 'text-white/60'}`} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className={`p-2.5 rounded-xl border transition-all ${image ? 'bg-orange-500/20 border-orange-500/40' : 'bg-white/5 border-white/10 hover:border-orange-500/40'}`}
              title="Photo attach karein"
            >
              <ImageIcon className="w-4 h-4 text-white/60" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button
              onClick={() => setShowRepo(!showRepo)}
              className={`p-2.5 rounded-xl border transition-all ${showRepo ? 'bg-orange-500/20 border-orange-500/40' : 'bg-white/5 border-white/10 hover:border-orange-500/40'}`}
              title="GitHub repo import"
            >
              <GitBranch className="w-4 h-4 text-white/60" />
            </button>
            <button
              onClick={() => send()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-white/25 mt-3">
            OmniX - Abbas Hussain ka personal AI workspace · 📸 Vision enabled
          </p>
        </div>
      </div>
    </main>
  );
}

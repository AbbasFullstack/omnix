'use client';
import { useEffect, useRef, useState } from 'react';
import { Zap, Send, Cpu, Image as ImageIcon, X, GitBranch, LogOut } from 'lucide-react';
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
    setInput('');
    const question = q || 'Is photo ko analyze karein';
    setMessages(m => [...m, { role: 'user', text: question, image: image || undefined }]);
    setLoading(true);
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
        setMessages(m => [...m, { role: 'ai', text: json.reply, model: json.used ? String(json.used).split('/').pop() : activeModel.name }]);
      } else {
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
                setMessages(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: aiText }; return c; });
              }
            } catch {}
          }
        }
      }
      setImage(null);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠️ Network error - dobara try karein.' }]);
    }
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
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="max-w-[85%]">
                  {m.model && (
                    <p className="text-[9px] text-orange-400/70 font-bold mb-1 uppercase tracking-wider">{m.model}</p>
                  )}
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/[0.04] border border-white/[0.07] text-sm leading-relaxed whitespace-pre-wrap">
                    {m.text}
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
          {loading && (
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

import Link from 'next/link';
import { Zap, MessageSquare, Mic, Image as ImageIcon, Music, Presentation, Clapperboard, GitBranch, Brain, User } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <header className="border-b border-white/[0.06] bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">OmniX</p>
              <p className="text-[9px] text-white/40 leading-tight">All-in-One Personal AI</p>
            </div>
          </div>
          <Link href="/login" className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold">
            Login / Sign Up
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              ⚡ OmniX — Your Personal AI Assistant
            </h1>
            <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto">
              Chat, voice calls, image generation, slides, videos, GitHub copilot, aur personal memory — sab aik hi jagah.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-base font-bold">
              <User className="w-5 h-5" /> Shuru Karein — Free!
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">✨ Sab Kuch Aik Jagah</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FeatureCard icon={MessageSquare} name="AI Chat" desc="Streaming chat with free models" color="orange" />
              <FeatureCard icon={Mic} name="Voice Call" desc="Roman Urdu mein baat karein" color="emerald" />
              <FeatureCard icon={ImageIcon} name="Image Gen" desc="FLUX se images banayein" color="pink" />
              <FeatureCard icon={Music} name="Audio/TTS" desc="Text se audio (Flux TTS)" color="purple" />
              <FeatureCard icon={Presentation} name="Slides" desc="Auto presentations" color="yellow" />
              <FeatureCard icon={Clapperboard} name="Video" desc="Cinematic video frames" color="red" />
              <FeatureCard icon={GitBranch} name="GitHub Copilot" desc="Repo import + AI push" color="blue" />
              <FeatureCard icon={Brain} name="Memory" desc="Personal brain for you" color="indigo" />
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section className="py-16 px-4 bg-white/[0.02] border-y border-white/[0.06]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-6">👨‍💻 Made by Abbas Hussain</h2>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <p className="text-base text-white/70 mb-2">
              16-year-old self-taught developer from Pakistan 🇵🇰
            </p>
            <p className="text-sm text-white/50">
              Built with curiosity, late nights, and a lot of coffee. OmniX is my personal workspace — now sharing it with you.
            </p>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs text-white/40 font-bold uppercase mb-4">Powered By</p>
            <div className="flex flex-wrap justify-center gap-3">
              <TechBadge>Next.js App Router</TechBadge>
              <TechBadge>TypeScript</TechBadge>
              <TechBadge>Tailwind CSS</TechBadge>
              <TechBadge>Supabase (Auth + RLS)</TechBadge>
              <TechBadge>OpenRouter AI</TechBadge>
              <TechBadge>HuggingFace FLUX</TechBadge>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">OmniX</span>
          </div>
          <p className="text-[10px] text-white/30">
            © 2024 Abbas Hussain. All rights reserved. · Made with ❤️ in Pakistan
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, name, desc, color }: { icon: any, name: string, desc: string, color: string }) {
  const colorClasses: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30',
  };
  const iconColors: Record<string, string> = {
    orange: 'text-orange-400', emerald: 'text-emerald-400', pink: 'text-pink-400',
    purple: 'text-purple-400', yellow: 'text-yellow-400', red: 'text-red-400',
    blue: 'text-blue-400', indigo: 'text-indigo-400',
  };
  
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm`}>
      <Icon className={`w-6 h-6 mb-3 ${iconColors[color]}`} />
      <p className="text-[11px] font-bold mb-1">{name}</p>
      <p className="text-[9px] text-white/40">{desc}</p>
    </div>
  );
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/50">
      {children}
    </span>
  );
}

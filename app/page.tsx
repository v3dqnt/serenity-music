'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { Play, MusicNotes, Waves, ShieldCheck } from "@phosphor-icons/react"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* ── Background Ambience ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="liquid-orb absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-white/10" />
        <div className="liquid-orb absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5" style={{ animationDelay: '-5s' }} />
        <div className="liquid-orb absolute top-[20%] left-[20%] w-[700px] h-[700px] rounded-full bg-white/5" style={{ animationDelay: '-12s' }} />
      </div>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "circOut" }}
        >
          <h1 className="text-8xl md:text-[160px] font-black tracking-tighter leading-none mb-4 select-none">
            SERENITY
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="max-w-2xl"
        >
          <p className="text-sm md:text-xl font-bold uppercase tracking-[0.4em] text-white/40 mb-12">
            Your High-Fidelity Sanctuary
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-16">
            <Link
              href="/auth"
              className="group relative flex items-center gap-3 px-10 py-5 rounded-3xl bg-white text-black font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_20px_60px_rgba(255,255,255,0.2)]"
            >
              <Play weight="fill" className="w-5 h-5" />
              Enter Sanctuary
            </Link>

            <div className="glass px-6 py-5 rounded-3xl flex items-center gap-3 border border-white/10">
              <ShieldCheck className="w-5 h-5 text-white/60" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                serenity-olive.vercel.app
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Features Grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12">
          <FeatureCard
            icon={<MusicNotes className="w-6 h-6" />}
            title="Pure Audio"
            desc="Experience music as it was meant to be heard with high-fidelity streams."
          />
          <FeatureCard
            icon={<Waves className="w-6 h-6" />}
            title="Sonic Bloom"
            desc="Advanced audio processing for clarity and deep, textured bass."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Local Primary"
            desc="Your library is cached locally for instant, offline-available playback."
          />
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
          Deployed to Serenity Olive &bull; 2026
        </p>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-panel p-8 rounded-[40px] text-left border border-white/5 hover:border-white/20 transition-all group"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white text-white group-hover:text-black transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight mb-3 text-white">
        {title}
      </h3>
      <p className="text-xs font-medium leading-relaxed text-white/40">
        {desc}
      </p>
    </motion.div>
  )
}

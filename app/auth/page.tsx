'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null); setSuccess(null); setLoading(true)
        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
                if (error) throw error
                setSuccess('Account created! Check your email to confirm, then log in.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                router.push('/home'); router.refresh()
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 500,
        outline: 'none',
    }

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom: 8,
    }

    return (
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
            {/* Liquid background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="liquid-orb absolute top-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-white" />
                <div className="liquid-orb absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/60" style={{ animationDelay: '-5s' }} />
                <div className="liquid-orb absolute top-[20%] left-[20%] w-[700px] h-[700px] rounded-full bg-white/20" style={{ animationDelay: '-12s' }} />
            </div>

            <div className="relative z-10 w-full max-w-sm mx-auto px-6">
                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <h1 className="text-6xl font-black tracking-tighter text-white">
                        SERENITY
                    </h1>
                    <p className="font-semibold mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
                        High-Fidelity Sanctuary
                    </p>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel rounded-3xl p-8 shadow-2xl"
                >
                    {/* Tab switcher */}
                    <div className="flex rounded-2xl p-1 mb-8 bg-white/5 border border-white/5">
                        {(['login', 'signup'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 uppercase tracking-widest"
                                style={mode === m
                                    ? { background: 'white', color: 'black', boxShadow: '0 4px 20px rgba(255,255,255,0.2)' }
                                    : { color: 'var(--text-muted)' }
                                }
                            >
                                {m === 'login' ? 'Log In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence mode="wait">
                            {mode === 'signup' && (
                                <motion.div
                                    key="displayname"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <label style={labelStyle}>Name</label>
                                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                                        placeholder="Your name" style={inputStyle} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com" required style={inputStyle} />
                        </div>

                        <div>
                            <label style={labelStyle}>Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required minLength={6} style={inputStyle} />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white/60">
                                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white/90">
                                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-4-4 1.414-1.414L11 14.172l5.586-5.586L18 10l-7 7z" /></svg>
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] text-black mt-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                            style={{ boxShadow: '0 8px 32px rgba(255,255,255,0.1)' }}
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Wait...
                                </span>
                                : mode === 'login' ? 'Proceed' : 'Create'
                            }
                        </motion.button>
                    </form>
                </motion.div>

                <p className="text-center text-[10px] uppercase tracking-[0.2em] mt-8 text-white/20">
                    Serenity © 2026
                </p>
            </div>
        </main>
    )
}

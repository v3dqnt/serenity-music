'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlass, X, Plus, List, Play, MusicNote } from '@phosphor-icons/react'

interface SearchBarProps {
    onPlay?: (track: any) => void
    onAddToQueue?: (track: any) => void
    onAddToPlaylist?: (track: any) => void
    onSelect?: (track: any) => void
    currentTrackId?: string | null
    loadingTrackId?: string | null
    onResults?: (count: number) => void
    variant?: 'default' | 'mini' | 'nav' | 'jam'
    placeholder?: string
}

export default function SearchBar({
    onPlay,
    onAddToQueue,
    onAddToPlaylist,
    onSelect,
    currentTrackId,
    loadingTrackId,
    onResults,
    variant = 'default',
    placeholder
}: SearchBarProps) {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [localResults, setLocalResults] = useState<any[]>([])
    const [appleResults, setAppleResults] = useState<any[]>([])
    const [webResults, setWebResults] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node))
                setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) handleSearch()
            else { setLocalResults([]); setAppleResults([]); setWebResults([]); onResults?.(0) }
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!query.trim()) return
        setLoading(true); setIsOpen(true)
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
            const data = await res.json()
            if (res.ok) {
                setLocalResults(data.local || []);
                setAppleResults(data.apple || []);
                setWebResults(data.web || [])
                onResults?.((data.local?.length || 0) + (data.apple?.length || 0) + (data.web?.length || 0))
            } else { setLocalResults([]); setAppleResults([]); setWebResults([]); onResults?.(0) }
        } catch { setLocalResults([]); setAppleResults([]); setWebResults([]); onResults?.(0) }
        finally { setLoading(false) }
    }

    const hasResults = localResults.length + appleResults.length + webResults.length > 0

    const TrackRow = ({ track, i }: { track: any; i: number }) => (
        <motion.div
            key={i}
            variants={{
                hidden: { opacity: 0, x: -10, scale: 0.98 },
                visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left group hover:bg-white/[0.08]"
            style={{ background: currentTrackId === track.id ? 'rgba(255,255,255,0.12)' : undefined }}
        >
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5 cursor-pointer shadow-lg"
                onClick={() => {
                    if (onSelect) onSelect(track)
                    else if (onPlay) onPlay(track)
                    setIsOpen(false)
                }}
            >
                {track.thumbnail
                    ? <img src={track.thumbnail} alt="" className="w-full h-full object-cover transition-all duration-300" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <MusicNote weight="bold" className="w-6 h-6 text-white/20" />
                    </div>
                }
            </motion.div>
            <div className={`flex-1 min-w-0 cursor-pointer ${isMobile ? 'py-0' : 'py-1'}`} onClick={() => {
                if (onSelect) onSelect(track)
                else if (onPlay) onPlay(track)
                setIsOpen(false)
            }}>
                <h4 className={`font-semibold text-white tracking-tight truncate ${isMobile ? 'text-[13px]' : 'text-[15px]'} leading-tight ${isMobile ? 'mb-0' : 'mb-1'}`}
                    dangerouslySetInnerHTML={{ __html: track.title }} />
                <p className={`label-caps !text-[10px] !tracking-[0.1em] opacity-40 truncate`}>{track.channelTitle}</p>
            </div>

            <div className={`flex items-center gap-1 md:gap-2 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'} transition-all duration-300`}>
                {onAddToPlaylist && (
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.15)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); setIsOpen(false) }}
                        className={`p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white transition-all`}
                        title="Add to Playlist"
                    >
                        <Plus weight="bold" className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                    </motion.button>
                )}

                {onAddToQueue && (
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.15)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onAddToQueue(track); setIsOpen(false) }}
                        className={`p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white transition-all`}
                        title="Add to Queue"
                    >
                        <List weight="bold" className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                    </motion.button>
                )}

                {onPlay && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onPlay(track); setIsOpen(false) }}
                        className="p-2 md:p-2.5 rounded-xl text-white hover:bg-white hover:text-black transition-all shadow-lg"
                    >
                        {loadingTrackId === track.id
                            ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            : <Play weight="fill" className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                        }
                    </motion.button>
                )}
            </div>
        </motion.div>
    )

    const ResultsContent = () => (
        <div className="p-4 space-y-2">
            {localResults.length > 0 && (
                <div className="space-y-1">
                    <div className="px-4 pt-2 pb-2">
                        <span className="label-caps opacity-40">
                            {variant === 'jam' ? 'Shared Pool' : 'Library'}
                        </span>
                    </div>
                    {localResults.map((t, i) => <TrackRow key={`l-${t.id}-${i}`} track={t} i={i} />)}
                </div>
            )}

            {appleResults.length > 0 && (
                <div className="space-y-1">
                    {(localResults.length > 0) && <div className="mx-4 my-4 h-px bg-white/10" />}
                    <div className="px-4 pt-2 pb-2">
                        <span className="label-caps !text-[#FA2D48]">
                            Apple Music
                        </span>
                    </div>
                    {appleResults.map((t, i) => <TrackRow key={`a-${t.id}-${i}`} track={t} i={i} />)}
                </div>
            )}

            {webResults.length > 0 && (
                <div className="space-y-1">
                    {(localResults.length > 0 || appleResults.length > 0) && <div className="mx-4 my-4 h-px bg-white/10" />}
                    <div className="px-4 pt-2 pb-2">
                        <span className="label-caps !text-[#FF0000]">
                            YouTube
                        </span>
                    </div>
                    {webResults.map((t, i) => <TrackRow key={`w-${t.id}-${i}`} track={t} i={i} />)}
                </div>
            )}
        </div>
    )

    if (variant === 'nav') {
        return (
            <div ref={containerRef} className="relative h-12 flex items-center">
                <motion.form
                    onSubmit={handleSearch}
                    whileFocus={{ scale: 1.01, y: -1 }}
                    whileHover={{ scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex items-center transition-all duration-300 ease-out rounded-full w-[calc(100vw-100px)] md:w-[450px] h-12 liquid-glass pl-5 relative overflow-hidden group ${isOpen || query ? 'border-white/40 shadow-[0_0_35px_rgba(255,255,255,0.2)]' : 'border-white/10 hover:border-white/25'}`}
                    style={{ borderWidth: '1px' }}
                    onClick={() => !isOpen && setIsOpen(true)}
                >
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.05] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="flex items-center justify-center shrink-0 text-white/40 transition-colors group-focus-within:text-white relative z-10">
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        ) : (
                            <MagnifyingGlass weight="bold" className="w-5 h-5" />
                        )}
                    </div>

                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Search vibes..."
                        className="bg-transparent focus:outline-none font-bold text-[13px] text-white placeholder-white/25 caret-white transition-all duration-300 w-full opacity-100 px-4 relative z-10"
                    />

                    <AnimatePresence>
                        {(query || isOpen) && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5, x: 10 }}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setQuery(''); setLocalResults([]); setWebResults([]); setIsOpen(false) }}
                                className="p-2 mr-1 hover:text-white text-white/30 transition-colors relative z-10"
                            >
                                <X weight="bold" className="w-3.5 h-3.5" />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Active Border Glow */}
                    {(isOpen || query) && (
                        <motion.div
                            layoutId="search-glow"
                            className="absolute inset-0 border border-white/20 rounded-full shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        />
                    )}
                </motion.form>

                <AnimatePresence>
                    {isOpen && hasResults && (
                        <motion.div
                            initial={{ opacity: 0, y: 15, scale: 0.92, rotateX: -10 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                            exit={{ opacity: 0, y: 15, scale: 0.92, rotateX: -10 }}
                            transition={{
                                type: "spring",
                                stiffness: 450,
                                damping: 30,
                                mass: 0.8
                            }}
                            className={`glass-dropdown ${isMobile ? 'fixed inset-x-4 top-[112px] rounded-[32px]' : 'absolute top-[calc(100%+16px)] left-0 w-[520px] rounded-[48px]'} overflow-hidden max-h-[70vh] overflow-y-auto z-[200] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] perspective-1000`}
                            style={{
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderTop: '1px solid rgba(255,255,255,0.3)',
                                backdropFilter: 'blur(40px) saturate(180%)'
                            }}
                        >
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.05 }
                                    }
                                }}
                            >
                                <ResultsContent />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    if (variant === 'mini' || variant === 'jam') {
        return (
            <div ref={containerRef} className="w-full">
                <form onSubmit={handleSearch} className="mb-4">
                    <div className="glass flex items-center w-full rounded-2xl border-white/10">
                        <div className="pl-4 text-white/20">
                            <MagnifyingGlass weight="bold" className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={placeholder || "Find a song..."}
                            className="flex-1 px-3 py-3 bg-transparent focus:outline-none font-bold text-xs text-white placeholder-white/20 caret-white"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`mr-1.5 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${variant === 'jam' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                        >
                            {loading ? '...' : (variant === 'jam' ? 'SYNC' : 'FIND')}
                        </button>
                    </div>
                </form>

                <AnimatePresence>
                    {hasResults && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <ResultsContent />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="relative w-full max-w-3xl mx-auto z-[100]">
            <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                whileFocus={{ scale: 1.01, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
                <div className={`glass flex items-center w-full rounded-full shadow-2xl shadow-black/40 border transition-all duration-500 overflow-hidden group ${isOpen || query ? 'border-white/30 bg-white/[0.05]' : 'border-white/10 hover:border-white/20'}`}>
                    <div className="pl-6 text-white/30 group-focus-within:text-white transition-colors">
                        <MagnifyingGlass weight="bold" className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => { if (hasResults) setIsOpen(true) }}
                        placeholder="What's the vibe today?"
                        className="flex-1 px-5 py-5 bg-transparent focus:outline-none font-bold text-base text-white placeholder-white/20 caret-white"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: '#fff' }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={loading}
                        className="mr-2.5 px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] bg-white text-black transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                    >
                        {loading ? '...' : 'Search'}
                    </motion.button>
                </div>
            </motion.form>

            <AnimatePresence>
                {isOpen && hasResults && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, rotateX: -10 }}
                        animate={{ opacity: 1, y: 12, scale: 1, rotateX: 0 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, rotateX: -10 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                            mass: 0.8
                        }}
                        className="glass-dropdown absolute top-full left-0 right-0 rounded-[48px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden max-h-[60vh] overflow-y-auto border border-white/15 perspective-1000"
                        style={{ backdropFilter: 'blur(50px) saturate(200%)' }}
                    >
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.04 }
                                }
                            }}
                        >
                            <ResultsContent />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

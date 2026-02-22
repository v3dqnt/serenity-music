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
        <div
            key={i}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left group hover:bg-white/[0.08]"
            style={{ background: currentTrackId === track.id ? 'rgba(255,255,255,0.12)' : undefined }}
        >
            <div
                className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5 cursor-pointer shadow-lg"
                onClick={() => {
                    if (onSelect) onSelect(track)
                    else if (onPlay) onPlay(track)
                    setIsOpen(false)
                }}
            >
                {track.thumbnail
                    ? <img src={track.thumbnail} alt="" className="w-full h-full object-cover transition-all duration-300" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <MusicNote weight="bold" className="w-6 h-6 text-white/20" />
                    </div>
                }
            </div>
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
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); setIsOpen(false) }}
                        className={`p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90`}
                        title="Add to Playlist"
                    >
                        <Plus weight="bold" className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                    </button>
                )}

                {onAddToQueue && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddToQueue(track); setIsOpen(false) }}
                        className={`p-2 md:p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90`}
                        title="Add to Queue"
                    >
                        <List weight="bold" className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                    </button>
                )}

                {onPlay && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPlay(track); setIsOpen(false) }}
                        className="p-2 md:p-2.5 rounded-xl text-white hover:bg-white hover:text-black transition-all active:scale-90 shadow-lg"
                    >
                        {loadingTrackId === track.id
                            ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            : <Play weight="fill" className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                        }
                    </button>
                )}
            </div>
        </div>
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
                <form
                    onSubmit={handleSearch}
                    className={`flex items-center transition-all duration-500 ease-out h-12 rounded-full ${isMobile || isOpen || query
                        ? 'w-[calc(100vw-120px)] md:w-72 bg-white/5 pr-2 border border-white/10'
                        : 'w-12 bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer'
                        }`}
                    onClick={() => !isOpen && setIsOpen(true)}
                >
                    <div
                        className="w-12 h-12 flex items-center justify-center shrink-0 text-white/40 group-hover:text-white transition-colors"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <MagnifyingGlass weight="bold" className="w-5 h-5" />
                        )}
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Search..."
                        className={`bg-transparent focus:outline-none font-semibold text-[13px] text-white placeholder-white/20 caret-white transition-all duration-500 ${isMobile || isOpen || query ? 'w-full opacity-100 px-2' : 'w-0 opacity-0 px-0 pointer-events-none'}`}
                    />
                    {(query || isOpen) && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setQuery(''); setLocalResults([]); setWebResults([]); setIsOpen(false) }}
                            className="p-1 hover:text-white text-white/20 transition-colors"
                        >
                            <X weight="bold" className="w-4 h-4" />
                        </button>
                    )}
                </form>

                <AnimatePresence>
                    {isOpen && hasResults && (
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.96 }}
                            className={`glass-dropdown ${isMobile ? 'fixed inset-x-4 top-[112px] rounded-[24px]' : 'absolute top-[calc(100%+20px)] left-0 w-[480px] rounded-[40px]'} overflow-hidden max-h-[70vh] overflow-y-auto z-[200] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]`}
                            style={{ border: '1px solid rgba(255,255,255,0.12)', borderTop: '1px solid rgba(255,255,255,0.25)' }}
                        >
                            <ResultsContent />
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
            <form onSubmit={handleSearch}>
                <div className="glass flex items-center w-full rounded-full shadow-2xl shadow-black/40 border-white/10">
                    <div className="pl-5 text-white/20">
                        <MagnifyingGlass weight="bold" className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => { if (hasResults) setIsOpen(true) }}
                        placeholder="Search track by name or artist..."
                        className="flex-1 px-4 py-4 bg-transparent focus:outline-none font-medium text-sm text-white placeholder-white/20 caret-white"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="mr-2 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest bg-white text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        style={{ boxShadow: '0 4px 20px rgba(255,255,255,0.1)' }}
                    >
                        {loading ? '...' : 'Search'}
                    </button>
                </div>
            </form>

            <AnimatePresence>
                {isOpen && hasResults && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="glass-dropdown absolute top-full left-0 right-0 mt-3 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden max-h-[60vh] overflow-y-auto border-white/10"
                    >
                        <ResultsContent />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

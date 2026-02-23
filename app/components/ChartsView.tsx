'use client'

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Track {
    id: string | null
    title: string
    thumbnail: string | null
    channelTitle: string
    viewCount?: string
    rank?: number
    needsResolution?: boolean
}

interface Region {
    code: string
    name: string
}

interface ChartsViewProps {
    onPlay: (track: any) => void
    currentTrackId?: string | null
    loadingTrackId?: string | null
}

const REGIONS: Region[] = [
    { code: 'US', name: 'USA' },
    { code: 'GB', name: 'UK' },
    { code: 'IN', name: 'India' },
    { code: 'KR', name: 'S. Korea' },
    { code: 'JP', name: 'Japan' },
    { code: 'BR', name: 'Brazil' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
];

const SOURCES = [
    { id: 'youtube', name: 'YouTube', icon: '🔥' },
    { id: 'billboard', name: 'Billboard', icon: '📈' },
    { id: 'shazam', name: 'Shazam', icon: '⚡' },
    { id: 'spotify', name: 'Spotify', icon: '🎧' },
];

export default function ChartsView({ onPlay, currentTrackId, loadingTrackId }: ChartsViewProps) {
    const [tracks, setTracks] = useState<Track[]>([])
    const [loading, setLoading] = useState(true)
    const [region, setRegion] = useState('US')
    const [source, setSource] = useState('youtube')
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const fetchCharts = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/charts?region=${region}&source=${source}`)
                if (res.ok) {
                    const data = await res.json()
                    setTracks(data.tracks)
                }
            } catch (e) {
                console.error('Failed to fetch charts:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchCharts()
    }, [region, source])

    const formatViews = (views: string | undefined) => {
        if (!views) return null
        const num = parseInt(views)
        if (isNaN(num)) return null
        if (num > 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num > 1000) return (num / 1000).toFixed(1) + 'K'
        return views
    }

    return (
        <div className="w-full">
            <div className="flex flex-col items-center justify-between mb-12 gap-6">
                <div className="text-center w-full">
                    <h2 className="heading-xl !text-5xl uppercase">Charts</h2>
                    <p className="label-caps opacity-40 mt-3">The world's most played music</p>
                </div>

                {/* Source Selector */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-0 md:flex-nowrap md:liquid-glass md:p-1.5 rounded-[28px] md:border-white/5 md:shadow-2xl md:backdrop-blur-3xl">
                    {SOURCES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSource(s.id)}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full md:rounded-[22px] nav-text transition-all flex items-center gap-2 md:gap-3 ${source === s.id
                                ? 'bg-white text-black shadow-xl md:scale-105'
                                : 'text-white/30 hover:text-white hover:bg-white/5 glass md:bg-transparent md:border-none'
                                }`}
                        >
                            <span className="text-base md:text-lg">{s.icon}</span>
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{s.name}</span>
                        </button>
                    ))}
                </div>

                {/* Region Selector (Only for YouTube and Shazam) */}
                {(source === 'youtube' || source === 'shazam') && (
                    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                        {REGIONS.map((r) => (
                            <button
                                key={r.code}
                                onClick={() => setRegion(r.code)}
                                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full nav-text !text-[9px] transition-all ${region === r.code
                                    ? 'bg-white/10 text-white border-white/20'
                                    : 'text-white/20 hover:text-white border-transparent hover:bg-white/5'
                                    } border`}
                            >
                                {r.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-40">
                    <div className="w-12 h-12 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode={isMobile ? undefined : "popLayout"}>
                        {tracks.map((track, idx) => {
                            const views = formatViews(track.viewCount)
                            const isSelected = (currentTrackId === track.id && track.id !== null) ||
                                (track.needsResolution && currentTrackId === null);

                            return (
                                <motion.div
                                    key={`${source}-${idx}-${track.id || 'stub'}`}
                                    initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: isMobile ? 0 : Math.min(idx * 0.03, 0.4) }}
                                    className={`group relative p-4 rounded-[32px] glass-card border flex items-center gap-5 cursor-pointer hover:bg-white/5 hover:translate-y-[-2px] ${isSelected ? 'border-white/30 bg-white/10' : 'border-white/5'
                                        }`}
                                    onClick={() => onPlay(track)}
                                >
                                    <div className="heading-xl !text-xl opacity-10 w-8 text-center group-hover:opacity-40 transition-all">
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </div>

                                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-2xl bg-white/5">
                                        {track.thumbnail ? (
                                            <img src={track.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                                                <svg className="w-6 h-6 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-white text-[15px] truncate mb-1" dangerouslySetInnerHTML={{ __html: track.title }} />
                                        <div className="flex items-center gap-2.5">
                                            <p className="label-caps !text-[9px] !tracking-[0.1em] opacity-40 truncate">{track.channelTitle}</p>
                                            {views && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                    <p className="label-caps !text-[9px] !tracking-[0.1em] opacity-30">{views} PLAYS</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white/10 group-hover:text-white group-hover:bg-white/10 transition-all">
                                        {(loadingTrackId === track.id || (track.needsResolution && loadingTrackId === 'resolving')) ? (
                                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ViewContent from './ViewContent'

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


export default function ChartsView({ onPlay, currentTrackId, loadingTrackId }: ChartsViewProps) {
    const [tracks, setTracks] = useState<Track[]>([])
    const [loading, setLoading] = useState(true)
    const [region, setRegion] = useState('US')
    const source = 'shazam'


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

    const chartsAction = (
        <div className="flex flex-wrap justify-center md:justify-end gap-1.5 md:gap-2">
            {REGIONS.map((r) => (
                <button
                    key={r.code}
                    onClick={() => setRegion(r.code)}
                    className={`px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase transition-all ${region === r.code
                        ? 'bg-white/10 text-white border-white/20'
                        : 'text-white/20 hover:text-white border-transparent hover:bg-white/5'
                        } border`}
                >
                    {r.name}
                </button>
            ))}
        </div>
    )

    return (
        <ViewContent
            title="Charts"
            subtitle="The world's most played music"
            action={chartsAction}
            refreshKey={tracks.length + (loading ? "loading" : "done")}
        >
            {loading ? (
                <div className="flex items-center justify-center py-40 modular-item opacity-0">
                    <div className="w-12 h-12 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
                    <AnimatePresence mode={undefined}>
                        {tracks.map((track, idx) => {
                            const views = formatViews(track.viewCount)
                            const isSelected = (currentTrackId === track.id && track.id !== null) ||
                                (track.needsResolution && currentTrackId === null);

                            return (
                                <div
                                    key={`${source}-${idx}-${track.id || 'stub'}`}
                                    className={`modular-item opacity-0 group relative p-4 rounded-[32px] glass-card border flex items-center gap-5 cursor-pointer hover:bg-white/5 transition-all ${isSelected ? 'border-white/30 bg-white/10' : 'border-white/5'
                                        }`}
                                    onClick={() => onPlay(track)}
                                >
                                    <div className="text-2xl font-black text-white/5 w-8 text-center group-hover:text-white/20 transition-all tracking-tighter">
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
                                        <h4 className="font-black text-white text-[15px] truncate mb-1" dangerouslySetInnerHTML={{ __html: track.title }} />
                                        <div className="flex items-center gap-2.5">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 truncate">{track.channelTitle}</p>
                                            {views && (
                                                <>
                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30">{views} PLAYS</p>
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
                                </div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </ViewContent>
    )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { animate, spring } from 'animejs'

interface CoverFlowProps {
    tracks: any[]
    onSelect: (track: any) => void
    activeTrackId?: string | null
    loadingTrackId?: string | null
    libraryTracks?: any[]
}

export default function CoverFlow({ tracks, onSelect, activeTrackId, loadingTrackId, libraryTracks = [] }: CoverFlowProps) {
    const [currentIndex, setCurrentIndex] = useState(Math.floor(tracks.length / 2))
    const [cardSize, setCardSize] = useState(300)
    const containerRef = useRef<HTMLDivElement>(null)

    // Derive responsive card size from viewport width
    const updateCardSize = useCallback(() => {
        const w = window.innerWidth
        if (w < 400) setCardSize(168)
        else if (w < 640) setCardSize(200)
        else if (w < 768) setCardSize(230)
        else setCardSize(300)
    }, [])

    useEffect(() => {
        updateCardSize()
        window.addEventListener('resize', updateCardSize)
        return () => window.removeEventListener('resize', updateCardSize)
    }, [updateCardSize])

    // Proportional spacing based on card size
    const xStrength = cardSize * 0.62
    const halfCard = cardSize / 2

    // Sync highlighted card to the active track
    useEffect(() => {
        if (!activeTrackId) return
        const idx = tracks.findIndex(t => t.id === activeTrackId)
        if (idx !== -1) setCurrentIndex(idx)
    }, [activeTrackId, tracks])

    // Run anime.js whenever currentIndex or cardSize changes
    useEffect(() => {
        if (!containerRef.current) return

        tracks.forEach((track, index) => {
            let offset = index - currentIndex
            if (offset < -Math.floor(tracks.length / 2)) offset += tracks.length
            if (offset > Math.floor(tracks.length / 2)) offset -= tracks.length

            const isCenter = index === currentIndex
            const absOffset = Math.abs(offset)
            const translateX = offset * xStrength
            const scale = isCenter ? 1.08 : Math.max(0.72, 1 - absOffset * 0.09)
            const opacity = absOffset > 3 ? 0 : Math.max(0, 1 - absOffset * 0.2)
            const zIndex = isCenter ? 20 : 20 - absOffset

            const el = containerRef.current?.querySelector(`[data-track-id="${track.id}"]`) as HTMLElement
            if (!el) return

            animate(el, {
                translateX,
                scale,
                opacity,
                ease: spring({ bounce: 0.18 }),
                duration: 450,
                begin: () => { el.style.zIndex = zIndex.toString() }
            })
        })
    }, [currentIndex, tracks, xStrength])

    if (!tracks || tracks.length === 0) return null

    const handleSelect = (index: number) => {
        if (index === currentIndex) {
            const track = tracks[index]
            const localMatch = libraryTracks.find(t => t.id === track.id)
            if (localMatch?.url) onSelect({ ...track, url: localMatch.url, isLocal: true })
            else onSelect(track)
        } else {
            setCurrentIndex(index)
        }
    }

    const currentTrack = tracks[currentIndex]

    return (
        <div className="relative w-full flex flex-col items-center">
            {/* Carousel */}
            <div
                ref={containerRef}
                className="relative w-full flex items-center justify-center"
                style={{ height: cardSize }}
            >
                {tracks.map((track, index) => {
                    const isCenter = index === currentIndex
                    return (
                        <div
                            key={track.id}
                            data-track-id={track.id}
                            className="absolute cursor-pointer"
                            style={{
                                width: cardSize,
                                height: cardSize,
                                left: '50%',
                                marginLeft: -halfCard,
                                opacity: 0,
                                willChange: 'transform, opacity'
                            }}
                            onClick={() => handleSelect(index)}
                        >
                            {/* Card shell */}
                            <div
                                className="w-full h-full rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
                                style={{
                                    filter: isCenter ? 'brightness(1.05)' : 'brightness(0.65)',
                                    transition: 'filter 0.35s ease'
                                }}
                            >
                                {track.thumbnail ? (
                                    <img
                                        src={track.thumbnail}
                                        alt={track.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center p-4 text-center">
                                        <div>
                                            <h3 className="text-white font-bold text-lg line-clamp-2">{track.title}</h3>
                                            <p className="text-white/60 text-sm mt-1">{track.channelTitle}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Center card: play overlay on hover */}
                                {isCenter && (
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-300 flex items-center justify-center group">
                                        {loadingTrackId === track.id ? (
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center">
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-black ml-0.5">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Side cards: dark scrim */}
                                {!isCenter && (
                                    <div className="absolute inset-0 bg-black/25 pointer-events-none" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Label — directly below carousel, no extra gap */}
            <div className="mt-4 w-full flex items-start justify-center" style={{ zIndex: 100 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="text-center pointer-events-none px-6 max-w-sm md:max-w-2xl"
                    >
                        <h3 className="text-white text-lg md:text-4xl font-black tracking-tight leading-snug truncate">
                            {currentTrack?.title}
                        </h3>
                        <p className="label-caps opacity-60 mt-1 !text-[9px] md:!text-[10px]">
                            {currentTrack?.channelTitle}
                        </p>
                        {libraryTracks.some(t => t.id === currentTrack?.id && t.url) && (
                            <span className="inline-block mt-2 px-2.5 py-1 rounded-full !text-[7px] label-caps bg-white/5 border border-white/10 text-white/50">
                                ✓ Authenticated
                            </span>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

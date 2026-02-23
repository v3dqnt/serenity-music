'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CoverFlowProps {
    tracks: any[]
    onSelect: (track: any) => void
    activeTrackId?: string | null
    loadingTrackId?: string | null
    libraryTracks?: any[]
}

export default function CoverFlow({ tracks, onSelect, activeTrackId, loadingTrackId, libraryTracks = [] }: CoverFlowProps) {
    const [currentIndex, setCurrentIndex] = useState(Math.floor(tracks.length / 2))
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Sync to the currently playing track whenever it changes
    useEffect(() => {
        if (!activeTrackId) return
        const idx = tracks.findIndex(t => t.id === activeTrackId)
        if (idx !== -1) setCurrentIndex(idx)
    }, [activeTrackId, tracks])

    if (!tracks || tracks.length === 0) return null

    const handleSelect = (index: number) => {
        if (index === currentIndex) {
            const track = tracks[index]
            // Check if already downloaded locally
            const localMatch = libraryTracks.find(t => t.id === track.id)
            if (localMatch?.url) {
                onSelect({ ...track, url: localMatch.url, isLocal: true })
            } else {
                onSelect(track)
            }
        } else {
            setCurrentIndex(index)
        }
    }

    const xStrength = isMobile ? 80 : 140
    const cardSize = isMobile ? 'w-48 h-48' : 'w-64 h-64'
    const cardMargin = isMobile ? '-ml-24' : '-ml-32'

    return (
        <div className="relative w-full flex flex-col items-center" style={{ paddingTop: isMobile ? '4rem' : '6rem' }}>

            {/* Carousel Row */}
            <div className={`relative w-full max-w-5xl ${isMobile ? 'h-48' : 'h-64'} flex items-center justify-center`}>
                {tracks.map((track, index) => {
                    let offset = index - currentIndex
                    if (offset < -Math.floor(tracks.length / 2)) offset += tracks.length
                    if (offset > Math.floor(tracks.length / 2)) offset -= tracks.length

                    const isCenter = index === currentIndex
                    const absOffset = Math.abs(offset)
                    const translateX = offset * xStrength
                    const scale = isCenter ? 1.25 : 1 - (absOffset * 0.05)
                    const zIndex = isCenter ? 20 : 20 - absOffset
                    const opacity = absOffset > 3 ? 0 : 1

                    if (opacity === 0) return null

                    return (
                        // Outer wrapper: handles position, translate, scale, zIndex — NO overflow:hidden
                        <motion.div
                            key={track.id}
                            className={`absolute ${cardSize} cursor-pointer left-1/2 ${cardMargin}`}
                            style={{ zIndex: isCenter ? 20 : 20 - absOffset }}
                            initial={false}
                            animate={{
                                x: translateX,
                                scale: scale,
                                opacity: opacity,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 250,
                                damping: 25,
                                mass: 0.8
                            }}
                            onClick={() => handleSelect(index)}
                        >
                            {/* Inner card: handles clipping and visual appearance */}
                            <div
                                className="w-full h-full rounded-3xl overflow-hidden shadow-2xl"
                                style={{
                                    filter: isCenter ? 'brightness(1.1)' : 'brightness(0.75)',
                                    transition: 'filter 0.3s ease'
                                }}
                            >
                                {track.thumbnail ? (
                                    <img
                                        src={track.thumbnail}
                                        alt={track.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[var(--color-obsidian)] flex items-center justify-center p-4 text-center">
                                        <div>
                                            <h3 className="text-white font-bold text-lg line-clamp-2">{track.title}</h3>
                                            <p className="text-white/60 text-sm">{track.channelTitle}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Play overlay on center card */}
                                {isCenter && (
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-300 flex items-center justify-center group">
                                        {loadingTrackId === track.id ? (
                                            <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl`}>
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] backdrop-blur-md`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "20" : "26"} height={isMobile ? "20" : "26"} viewBox="0 0 24 24" fill="currentColor" className="text-black ml-1"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isCenter && (
                                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Label — rendered OUTSIDE the card motion.div so it's never clipped */}
            <div className={`relative ${isMobile ? 'h-20 mt-10' : 'h-24 mt-16'} flex items-start justify-center w-full`} style={{ zIndex: 100 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="text-center pointer-events-none px-6"
                    >
                        <h3 className={`text-white ${isMobile ? 'text-2xl' : 'text-5xl'} font-black mb-1`}>
                            {tracks[currentIndex]?.title}
                        </h3>
                        <p className={`label-caps opacity-60 ${isMobile ? '!text-[9px]' : ''}`}>
                            {tracks[currentIndex]?.channelTitle}
                        </p>
                        {/* LOCAL badge */}
                        {libraryTracks.some(t => t.id === tracks[currentIndex]?.id && t.url) && (
                            <span className="inline-block mt-4 px-3 py-1 rounded-full label-caps bg-white/5 border border-white/10 text-white/50">
                                ✓ Authenticated
                            </span>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

        </div>
    )
}

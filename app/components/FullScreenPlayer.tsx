'use client'

import { motion } from "framer-motion"

interface FullScreenPlayerProps {
    track: any
    onMinimize: () => void
    children: React.ReactNode // The audio player
}

export default function FullScreenPlayer({ track, onMinimize, children }: FullScreenPlayerProps) {
    if (!track) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[var(--color-obsidian)]"
        >
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <img
                    src={track.thumbnail}
                    alt=""
                    className="w-full h-full object-cover blur-3xl opacity-50 scale-110"
                />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Minimize Button */}
            <button
                onClick={onMinimize}
                className="absolute top-8 left-8 z-10 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-8 space-y-12">

                {/* Album Art */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative w-full aspect-square max-w-[400px] shadow-2xl rounded-3xl overflow-hidden border-2 border-white/10"
                >
                    <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                {/* Track Info */}
                <div className="text-center space-y-4">
                    <h2
                        className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-lg"
                        dangerouslySetInnerHTML={{ __html: track.title }}
                    />
                    <p className="text-xl text-white/70 font-medium">
                        {track.channelTitle}
                    </p>
                </div>

                {/* Controls (Injected) */}
                <div className="w-full p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl">
                    {children}
                </div>

            </div>
        </motion.div>
    )
}

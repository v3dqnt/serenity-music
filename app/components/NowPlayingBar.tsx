'use client'

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import {
    Play, Pause, SkipBack, SkipForward, List,
    Repeat, RepeatOnce, Plus, CaretDown, DotsThree,
    X, MagicWand, Waves, MusicNotes
} from "@phosphor-icons/react"

interface NowPlayingBarProps {
    track: any
    src: string
    onClose: () => void
    isLoading?: boolean
    queue?: any[]
    onPlayNext?: () => void
    onAlmostDone?: () => void
    onAddToPlaylist?: (track: any) => void
}

type AudioEnhancedElement = HTMLAudioElement & {
    _audioCtx?: AudioContext
    _audioSource?: MediaElementAudioSourceNode
}

export default function NowPlayingBar({
    track,
    src,
    onClose,
    isLoading = false,
    queue = [],
    onPlayNext,
    onAlmostDone,
    onAddToPlaylist
}: NowPlayingBarProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const [isExpanded, setIsExpanded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [showQueue, setShowQueue] = useState(false)
    const [hasTriggeredAlmostDone, setHasTriggeredAlmostDone] = useState(false)

    const [voiceClarity, setVoiceClarity] = useState(false)
    const [bassBoost, setBassBoost] = useState(false)
    const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off')

    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
    const bassFilterRef = useRef<BiquadFilterNode | null>(null)
    const clarityFilterRef = useRef<BiquadFilterNode | null>(null)
    const airFilterRef = useRef<BiquadFilterNode | null>(null)

    useEffect(() => {
        const audioEl = audioRef.current as AudioEnhancedElement | null
        if (!audioEl) return

        if (!audioEl._audioCtx || audioEl._audioCtx.state === 'closed') {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext
            audioEl._audioCtx = new AC()
        }
        const ctx = audioEl._audioCtx!

        if (!audioEl._audioSource) {
            try {
                audioEl._audioSource = ctx.createMediaElementSource(audioEl)
            } catch (e) {
                return
            }
        }
        const source = audioEl._audioSource
        sourceRef.current = source

        const bass = ctx.createBiquadFilter()
        bass.type = 'lowshelf'
        bass.frequency.value = 80
        bass.gain.value = 0
        bassFilterRef.current = bass

        const clarity = ctx.createBiquadFilter()
        clarity.type = 'peaking'
        clarity.frequency.value = 3000
        clarity.Q.value = 1.2
        clarity.gain.value = 0
        clarityFilterRef.current = clarity

        const air = ctx.createBiquadFilter()
        air.type = 'highshelf'
        air.frequency.value = 12000
        air.gain.value = 0
        airFilterRef.current = air

        try { source.disconnect() } catch (_) { }
        source.connect(bass)
        bass.connect(clarity)
        clarity.connect(air)
        air.connect(ctx.destination)

        return () => {
            try {
                bass.disconnect()
                clarity.disconnect()
                air.disconnect()
                source.connect(ctx.destination)
            } catch (_) { }
        }
    }, [track.id])

    useEffect(() => {
        const audioEl = audioRef.current as AudioEnhancedElement | null
        const ctx = audioEl?._audioCtx
        if (clarityFilterRef.current && airFilterRef.current && bassFilterRef.current && ctx) {
            clarityFilterRef.current.gain.setTargetAtTime(voiceClarity ? 4.5 : 0, ctx.currentTime, 0.15)
            airFilterRef.current.gain.setTargetAtTime(voiceClarity ? 3.5 : 0, ctx.currentTime, 0.15)
            bassFilterRef.current.gain.setTargetAtTime(bassBoost ? 6.5 : 0, ctx.currentTime, 0.15)
        }
    }, [voiceClarity, bassBoost])

    useEffect(() => {
        if (audioRef.current && src) {
            audioRef.current.play().catch(e => console.log("Autoplay blocked:", e))
            setIsPlaying(true)
            setHasTriggeredAlmostDone(false)
            const ctx = (audioRef.current as AudioEnhancedElement)?._audioCtx
            if (ctx?.state === 'suspended') ctx.resume()
        }
    }, [src])

    useGSAP(() => {
        if (!containerRef.current || !barRef.current || !overlayRef.current) return

        if (isExpanded) {
            gsap.to(overlayRef.current, { opacity: 1, backdropFilter: 'blur(32px) saturate(160%)', duration: 0.8, ease: 'power3.out' })
            gsap.to(bgRef.current, { opacity: 1, duration: 1.5, delay: 0.1, ease: 'power3.out' })

            gsap.to(containerRef.current, {
                top: 0, left: 0, xPercent: 0, x: 0,
                width: '100%', maxWidth: '100%', height: '100vh',
                borderRadius: 0, duration: 0.85, ease: 'expo.out'
            })

            gsap.to(barRef.current, {
                height: '100%', padding: '0px',
                borderRadius: 0, background: 'rgba(0,0,0,0.1)',
                backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)',
                border: 'none',
                duration: 0.85, ease: 'expo.out'
            })
        } else {
            gsap.to(overlayRef.current, { opacity: 0, duration: 0.5, ease: 'power3.inOut' })
            gsap.to(bgRef.current, { opacity: 0, duration: 0.5, ease: 'power3.inOut' })

            const targetHeight = isMobile ? 72 : 88
            const targetBottom = isMobile ? 24 : 36
            const targetTop = window.innerHeight - targetBottom - targetHeight

            gsap.to(containerRef.current, {
                top: targetTop,
                left: '50%',
                xPercent: -50,
                width: isMobile ? '92%' : '85%',
                maxWidth: '840px',
                height: targetHeight,
                borderRadius: isMobile ? '24px' : '32px',
                duration: 0.75,
                ease: 'expo.inOut',
                onComplete: () => {
                    gsap.set(containerRef.current, {
                        clearProps: 'top,width,maxWidth,height,borderRadius,left,xPercent,x'
                    })
                }
            })

            gsap.to(barRef.current, {
                height: '100%',
                padding: isMobile ? '8px 16px' : '12px 36px',
                borderRadius: isMobile ? '24px' : '32px',
                background: 'rgba(20, 20, 25, 0.45)',
                backdropFilter: 'blur(50px) saturate(220%)',
                WebkitBackdropFilter: 'blur(50px) saturate(220%)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderTop: '1px solid rgba(255, 255, 255, 0.28)',
                boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.7)',
                duration: 0.75,
                ease: 'expo.inOut'
            })
        }
    }, [isExpanded, isMobile])

    const togglePlay = () => {
        if (!audioRef.current) return;
        const ctx = (audioRef.current as AudioEnhancedElement)?._audioCtx
        if (ctx?.state === 'suspended') ctx.resume()
        if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
        setIsPlaying(p => !p);
    }

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const cur = audioRef.current.currentTime;
        const dur = audioRef.current.duration;
        setCurrentTime(cur);
        setProgress((cur / dur) * 100);
        if (dur > 0 && dur - cur <= 15 && !hasTriggeredAlmostDone) {
            setHasTriggeredAlmostDone(true)
            onAlmostDone?.()
        }
    }

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const t = (Number(e.target.value) / 100) * duration;
        if (audioRef.current) { audioRef.current.currentTime = t; setProgress(Number(e.target.value)); }
    }

    const fmt = (t: number) => {
        if (!t || isNaN(t)) return "0:00";
        return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    }

    return (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div
                ref={overlayRef}
                onClick={() => setIsExpanded(false)}
                className={`absolute inset-0 bg-black/50 opacity-0 pointer-events-none transition-all`}
                style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
            />

            <div ref={bgRef} className="absolute inset-0 opacity-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ x: [0, 80, 0], y: [0, -40, 0], rotate: [0, 100, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-15%] left-[-5%] w-[90%] h-[90%] rounded-full blur-[140px] opacity-[0.35]"
                    style={{ background: `radial-gradient(circle, ${track.thumbnail ? 'transparent' : 'rgba(255,255,255,0.08)'} 0%, transparent 70%)`, backgroundImage: `url(${track.thumbnail})`, backgroundSize: 'cover' }}
                />
                <motion.div
                    animate={{ x: [0, -80, 0], y: [0, 50, 0], rotate: [360, 0, 360] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-15%] right-[-5%] w-[80%] h-[80%] rounded-full blur-[120px] opacity-[0.3] hue-rotate-[160deg]"
                    style={{ background: `radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)`, backgroundImage: `url(${track.thumbnail})`, backgroundSize: 'cover' }}
                />
            </div>

            <div
                ref={containerRef}
                className="absolute bottom-9 w-[85%] max-w-[840px] h-[88px] pointer-events-auto"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
            >
                <audio
                    ref={audioRef}
                    src={src || undefined}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => onPlayNext?.()}
                    className="hidden"
                    crossOrigin="anonymous"
                />

                <div
                    ref={barRef}
                    className="relative w-full h-full flex items-center shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/12 group/bar bg-transparent rounded-[32px]"
                    style={{ padding: isExpanded ? '0px' : '12px 24px' }}
                >
                    {isExpanded ? (
                        <FullScreenPlayer
                            track={track}
                            isPlaying={isPlaying}
                            progress={progress}
                            currentTime={currentTime}
                            duration={duration}
                            isLoading={isLoading}
                            voiceClarity={voiceClarity}
                            bassBoost={bassBoost}
                            repeat={repeat}
                            showQueue={showQueue}
                            queue={queue}
                            onTogglePlay={togglePlay}
                            onSeek={handleSeek}
                            onSetIsExpanded={setIsExpanded}
                            onSetVoiceClarity={setVoiceClarity}
                            onSetBassBoost={setBassBoost}
                            onSetRepeat={setRepeat}
                            onSetShowQueue={setShowQueue}
                            onPlayNext={onPlayNext}
                            fmt={fmt}
                            isMobile={isMobile}
                        />
                    ) : (
                        <MiniPlayer
                            track={track}
                            isPlaying={isPlaying}
                            progress={progress}
                            isLoading={isLoading}
                            showQueue={showQueue}
                            repeat={repeat}
                            onTogglePlay={togglePlay}
                            onSetIsExpanded={setIsExpanded}
                            onSetShowQueue={setShowQueue}
                            onSetRepeat={setRepeat}
                            onPlayNext={onPlayNext}
                            onAddToPlaylist={onAddToPlaylist}
                            queueLength={queue.length}
                            queue={queue}
                            isMobile={isMobile}
                        />
                    )}
                </div>

                <AnimatePresence>
                    {showQueue && (
                        <motion.div
                            initial={{ opacity: 0, y: isExpanded ? 40 : 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: isExpanded ? 40 : 20, scale: 0.95 }}
                            className={`absolute right-0 w-[420px] max-h-[70vh] glass-panel rounded-[42px] p-8 flex flex-col z-[200] shadow-[0_48px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden ${isExpanded ? 'bottom-32' : 'bottom-[110px]'}`}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h5 className="font-black text-[14px] uppercase tracking-[0.3em] text-white">Up Next</h5>
                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1.5">{queue.length} Tracks In Queue</p>
                                </div>
                                <button onClick={() => setShowQueue(false)} className="p-3 rounded-2xl glass hover:bg-white/10 text-white/30 hover:text-white transition-all">
                                    <X weight="bold" className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-3">
                                {queue.map((qTrack: any, idx: number) => (
                                    <motion.div
                                        key={`${qTrack.id}-${idx}`}
                                        className="p-5 bg-white/[0.03] rounded-3xl border border-white/[0.03] flex items-center gap-5 group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
                                    >
                                        <img src={qTrack.thumbnail} className="w-14 h-14 rounded-2xl object-cover shadow-lg" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate text-white uppercase tracking-tight">{qTrack.title}</p>
                                            <p className="text-[10px] text-white/30 truncate uppercase tracking-widest mt-1.5 font-black">{qTrack.channelTitle}</p>
                                        </div>
                                        <span className="text-[11px] font-black text-white/10 group-hover:text-white/40 transition-colors">#{idx + 1}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    )
}

function MiniPlayer({
    track, isPlaying, progress, isLoading, showQueue, repeat,
    onTogglePlay, onSetIsExpanded, onSetShowQueue, onSetRepeat, onPlayNext, onAddToPlaylist, queueLength, queue, isMobile
}: any) {
    return (
        <div className="w-full h-full flex items-center justify-between gap-4 relative">
            {/* LEFT: Playback Controls (Hidden on mobile) */}
            {!isMobile && (
                <div className="flex items-center gap-3 shrink-0">
                    <button className="text-white/20 hover:text-white transition-all hover:scale-110 active:scale-95">
                        <SkipBack weight="fill" className="w-5 h-5" />
                    </button>

                    <button
                        onClick={e => { e.stopPropagation(); onTogglePlay() }}
                        disabled={isLoading}
                        className="group relative rounded-full flex items-center justify-center transition-all bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 w-11 h-11"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : isPlaying ? (
                            <Pause weight="fill" className="w-6 h-6" />
                        ) : (
                            <Play weight="fill" className="w-6 h-6 translate-x-0.5" />
                        )}
                    </button>

                    <button onClick={onPlayNext} className="text-white/20 hover:text-white transition-all hover:scale-110 active:scale-95">
                        <SkipForward weight="fill" className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* CENTER: Now Playing Island (Becomes main area on mobile) */}
            <div
                onClick={() => onSetIsExpanded(true)}
                className={`flex-1 min-w-0 flex items-center bg-white/[0.03] border-t border-white/[0.12] border-x border-white/[0.05] rounded-[40px] ${isMobile ? 'px-3 py-1.5 gap-3 border-none bg-transparent' : 'px-4 py-2 gap-4'} hover:bg-white/[0.06] transition-all cursor-pointer group/island ${isMobile ? 'max-w-none' : 'max-w-[440px]'} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]`}
            >
                <motion.div
                    layoutId="track-art"
                    className={`relative shrink-0 ${isMobile ? 'w-10 h-10' : 'w-9 h-9'} rounded-full shadow-xl overflow-hidden border border-white/10`}
                >
                    <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                </motion.div>

                <div className="flex-1 min-w-0 flex flex-col gap-0 md:gap-1.5 justify-center">
                    <h4
                        className={`font-black tracking-tighter truncate text-white leading-tight ${isMobile ? 'text-base' : 'text-xl'}`}
                        dangerouslySetInnerHTML={{ __html: track.title }}
                    />
                    {!isMobile && (
                        <div className="relative w-full h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white shadow-[0_0_10px_white]"
                                style={{ width: `${progress}%` }}
                                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            />
                        </div>
                    )}
                </div>

                {isMobile ? (
                    <div className="flex items-center gap-4 shrink-0 px-2">
                        <button
                            onClick={e => { e.stopPropagation(); onTogglePlay() }}
                            disabled={isLoading}
                            className="bg-white text-black rounded-full flex items-center justify-center w-9 h-9 shadow-lg"
                        >
                            {isLoading ? (
                                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : isPlaying ? (
                                <Pause weight="fill" className="w-5 h-5" />
                            ) : (
                                <Play weight="fill" className="w-5 h-5 translate-x-0.5" />
                            )}
                        </button>
                        <button onClick={e => { e.stopPropagation(); onPlayNext() }} className="text-white/60 hover:text-white">
                            <SkipForward weight="fill" className="w-6 h-6" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 shrink-0 opacity-20 group-hover/island:opacity-100 transition-opacity">
                        <button className="p-1 hover:text-white text-white/40 transition-colors">
                            <DotsThree weight="bold" className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT: Utility Controls */}
            {!isMobile && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSetShowQueue(!showQueue) }}
                        className={`p-2.5 rounded-full transition-all active:scale-90 ${showQueue ? 'text-white bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                    >
                        <List weight="bold" className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onSetRepeat((r: any) => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off') }}
                        className={`p-2.5 rounded-full transition-all active:scale-90 ${repeat !== 'off' ? 'text-white bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                    >
                        {repeat === 'one' ? <RepeatOnce weight="bold" className="w-5 h-5" /> : <Repeat weight="bold" className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddToPlaylist?.(track) }}
                        className="p-2.5 rounded-full text-white/20 hover:text-white hover:bg-white/5 transition-all active:scale-90"
                    >
                        <Plus weight="bold" className="w-5 h-5" />
                    </button>
                </div>
            )}

        </div>
    )
}

function FullScreenPlayer({
    track, isPlaying, progress, currentTime, duration, isLoading,
    voiceClarity, bassBoost, repeat, showQueue, queue,
    onTogglePlay, onSeek, onSetIsExpanded, onSetVoiceClarity, onSetBassBoost, onSetRepeat, onSetShowQueue, onPlayNext, fmt, isMobile
}: any) {
    return (
        <div className={`w-full h-full flex flex-col items-center justify-center ${isMobile ? 'gap-6 px-6' : 'gap-8 px-12'} max-w-5xl mx-auto py-10 relative overflow-hidden`}>
            <button
                onClick={() => onSetIsExpanded(false)}
                className={`absolute ${isMobile ? 'top-6 left-6 p-3 rounded-[24px]' : 'top-10 left-10 p-4 rounded-[28px]'} glass hover:bg-white/10 text-white/40 hover:text-white transition-all z-20 group active:scale-90`}
            >
                <CaretDown weight="bold" className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} transform group-hover:translate-y-0.5 transition-transform`} />
            </button>

            <motion.div
                layoutId="track-art"
                className={`relative shrink-0 ${isMobile ? 'w-[280px] h-[280px] rounded-[48px]' : 'w-[360px] h-[360px] rounded-[64px]'} shadow-[0_40px_100px_rgba(0,0,0,0.7)] overflow-hidden border-[5px] border-white/20`}
            >
                <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
                        <div className={`w-14 h-14 ${isMobile ? 'border-[3px]' : 'border-[5px]'} border-white border-t-transparent rounded-full animate-spin shadow-[0_0_20px_white]`} />
                    </div>
                )}
            </motion.div>

            <div className="flex flex-col text-center w-full gap-8 md:gap-10">
                <div className="space-y-3 md:space-y-4">
                    <h4
                        className={`font-black tracking-tighter truncate text-white leading-[1.1] ${isMobile ? 'text-3xl' : 'text-5xl'} drop-shadow-2xl px-4`}
                        dangerouslySetInnerHTML={{ __html: track.title }}
                    />
                    <p className={`font-black uppercase tracking-[0.4em] text-white/40 ${isMobile ? 'text-[9px]' : 'text-[11px]'}`}>
                        {isLoading ? 'Decrypting Stream...' : track.channelTitle}
                    </p>
                </div>

                <div className="w-full max-w-3xl mx-auto space-y-8 md:space-y-10">
                    <div className="space-y-4 md:space-y-5">
                        <input
                            type="range"
                            min="0" max="100"
                            value={progress || 0}
                            onChange={onSeek}
                            className="w-full h-1.5 md:h-2 cursor-pointer appearance-none bg-white/10 rounded-full accent-white hover:bg-white/20 transition-colors"
                        />
                        <div className="flex justify-between text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">
                            <span>{fmt(currentTime)}</span>
                            <span>{fmt(duration)}</span>
                        </div>
                    </div>

                    <div className={`flex items-center justify-center ${isMobile ? 'gap-4 max-w-xs' : 'gap-6 md:gap-8'} mx-auto`}>
                        <ControlBtn
                            active={voiceClarity}
                            onClick={() => onSetVoiceClarity(!voiceClarity)}
                            icon={<MagicWand weight={voiceClarity ? "fill" : "light"} className={isMobile ? "w-5 h-5" : "w-6 h-6"} />}
                            label="Clarity"
                            isMobile={isMobile}
                        />
                        <ControlBtn
                            active={bassBoost}
                            onClick={() => onSetBassBoost(!bassBoost)}
                            icon={<Waves weight={bassBoost ? "fill" : "light"} className={isMobile ? "w-5 h-5" : "w-6 h-6"} />}
                            label="Bass"
                            isMobile={isMobile}
                        />
                        <ControlBtn
                            active={showQueue}
                            onClick={() => onSetShowQueue(!showQueue)}
                            icon={<List weight={showQueue ? "fill" : "light"} className={isMobile ? "w-5 h-5" : "w-6 h-6"} />}
                            label="Queue"
                            isMobile={isMobile}
                        />
                        <ControlBtn
                            active={repeat !== 'off'}
                            onClick={() => onSetRepeat((r: any) => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')}
                            icon={repeat === 'one' ? <RepeatOnce weight="fill" className={isMobile ? "w-5 h-5" : "w-6 h-6"} /> : <Repeat weight={repeat !== 'off' ? "fill" : "light"} className={isMobile ? "w-5 h-5" : "w-6 h-6"} />}
                            label={repeat === 'one' ? 'Repeat 1' : 'Repeat'}
                            isMobile={isMobile}
                        />
                    </div>

                    <div className={`flex items-center justify-center gap-10 md:gap-12 ${isMobile ? 'scale-[1.1]' : 'scale-[1.25]'} mt-6`}>
                        <button className="text-white/30 hover:text-white transition-all hover:scale-120 active:scale-95">
                            <SkipBack weight="fill" className={isMobile ? "w-7 h-7" : "w-8 h-8"} />
                        </button>
                        <button
                            onClick={onTogglePlay}
                            disabled={isLoading}
                            className={`group relative rounded-full flex items-center justify-center transition-all bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-90 ${isMobile ? 'w-12 h-12' : 'w-14 h-14'}`}
                        >
                            {isLoading ? (
                                <div className={`${isMobile ? 'w-5 h-5 border-2' : 'w-6 h-6 border-3'} border-black border-t-transparent rounded-full animate-spin`} />
                            ) : isPlaying ? (
                                <Pause weight="fill" className={isMobile ? "w-7 h-7" : "w-8 h-8"} />
                            ) : (
                                <Play weight="fill" className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} translate-x-0.5`} />
                            )}
                        </button>
                        <button onClick={onPlayNext} className="text-white/30 hover:text-white transition-all hover:scale-120 active:scale-95">
                            <SkipForward weight="fill" className={isMobile ? "w-7 h-7" : "w-8 h-8"} />
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}

function ControlBtn({ active, onClick, icon, label, isMobile }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isMobile?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center ${isMobile ? 'gap-1.5 w-auto min-w-[64px] aspect-square p-2' : 'gap-2.5 w-24 aspect-square'} rounded-[32px] transition-all group active:scale-95 ${active
                ? 'bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.3)]'
                : 'text-white/30 hover:text-white hover:bg-white/5 border border-white/5'
                }`}
        >
            <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-all duration-300`}>
                {icon}
            </div>
            <span className={`${isMobile ? 'text-[8px]' : 'text-[11px]'} font-accent uppercase tracking-[0.15em] ${active ? 'text-black font-bold' : 'text-white/20'}`}>{label}</span>
        </button>
    )
}

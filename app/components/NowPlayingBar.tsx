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
    src: string | null
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
    const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off')

    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
    const bassFilterRef = useRef<BiquadFilterNode | null>(null)
    const clarityFilterRef = useRef<BiquadFilterNode | null>(null)
    const airFilterRef = useRef<BiquadFilterNode | null>(null)
    const compressorRef = useRef<DynamicsCompressorNode | null>(null)
    const pannerRef = useRef<StereoPannerNode | null>(null)
    const masterGainRef = useRef<GainNode | null>(null)

    useEffect(() => {
        const audioEl = audioRef.current as AudioEnhancedElement | null
        if (!audioEl) return

        if (!audioEl._audioCtx) {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext
            // 'playback' hint tells the OS to prioritize audio quality/fidelity over low latency
            audioEl._audioCtx = new AC({
                latencyHint: 'playback',
                sampleRate: 44100
            })
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

        // 1. Bass Filter
        const bass = ctx.createBiquadFilter()
        bass.type = 'lowshelf'
        bass.frequency.value = 80
        bass.gain.value = 0
        bassFilterRef.current = bass

        // 2. Clarity (High-Mid)
        const clarity = ctx.createBiquadFilter()
        clarity.type = 'peaking'
        clarity.frequency.value = 3000
        clarity.Q.value = 1.2
        clarity.gain.value = 0
        clarityFilterRef.current = clarity

        // 3. Air (High End)
        const air = ctx.createBiquadFilter()
        air.type = 'highshelf'
        air.frequency.value = 12000
        air.gain.value = 0
        airFilterRef.current = air

        // 4. Dynamics Compressor (CRITICAL: Fixes volume fluctuation and prevents clipping)
        // Optimized for Mobile Speakers: High threshold, low ratio for "Mastering" feel rather than "Pumping" feel
        const compressor = ctx.createDynamicsCompressor()
        compressor.threshold.setValueAtTime(-18, ctx.currentTime)
        compressor.knee.setValueAtTime(40, ctx.currentTime)
        compressor.ratio.setValueAtTime(4, ctx.currentTime)
        compressor.attack.setValueAtTime(0.01, ctx.currentTime)
        compressor.release.setValueAtTime(0.25, ctx.currentTime)
        compressorRef.current = compressor

        // 5. Stereo Panner for Spatial effect
        const panner = ctx.createStereoPanner()
        panner.pan.setValueAtTime(0, ctx.currentTime)
        pannerRef.current = panner

        // 6. Master Gain (Capping to 0.85 to give OS headroom, prevents speaker ducking)
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(0.85, ctx.currentTime)
        masterGainRef.current = masterGain

        try { source.disconnect() } catch (_) { }
        source.connect(bass)
        bass.connect(clarity)
        clarity.connect(air)
        air.connect(panner)
        panner.connect(compressor)
        compressor.connect(masterGain)
        masterGain.connect(ctx.destination)

        return () => {
            try {
                bass.disconnect()
                clarity.disconnect()
                air.disconnect()
                panner.disconnect()
                compressor.disconnect()
                masterGain.disconnect()
                source.connect(ctx.destination)
            } catch (_) { }
        }
    }, [track.id])

    useEffect(() => {
        const audioEl = audioRef.current as AudioEnhancedElement | null
        const ctx = audioEl?._audioCtx
        if (clarityFilterRef.current && airFilterRef.current && bassFilterRef.current && compressorRef.current && pannerRef.current && masterGainRef.current && ctx) {
            if (!voiceClarity) {
                // TRUE BYPASS: Direct connection for 100% original fidelity
                // This prevents the OS from applying "voice/call" processing
                try {
                    sourceRef.current?.disconnect();
                    sourceRef.current?.connect(ctx.destination);
                } catch (e) { }
            } else {
                // ENHANCED CLARITY SOUND
                try {
                    sourceRef.current?.disconnect();
                    sourceRef.current?.connect(bassFilterRef.current);
                } catch (e) { }

                clarityFilterRef.current.gain.setTargetAtTime(3.5, ctx.currentTime, 0.2)
                airFilterRef.current.gain.setTargetAtTime(2.5, ctx.currentTime, 0.2)
                bassFilterRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
                pannerRef.current.pan.setTargetAtTime(0, ctx.currentTime, 0.2)

                // Stabilize with subtle compression to prevent clipping/fluctuation
                compressorRef.current.threshold.setTargetAtTime(-18, ctx.currentTime, 0.2)
                compressorRef.current.ratio.setTargetAtTime(4, ctx.currentTime, 0.2)
                masterGainRef.current.gain.setTargetAtTime(0.85, ctx.currentTime, 0.2)
            }
        }
    }, [voiceClarity])

    useEffect(() => {
        if ('mediaSession' in navigator && track) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.channelTitle,
                album: 'Serenity',
                artwork: [
                    { src: track.thumbnail || '', sizes: '512x512', type: 'image/jpeg' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', togglePlay);
            navigator.mediaSession.setActionHandler('pause', togglePlay);
            navigator.mediaSession.setActionHandler('previoustrack', onAlmostDone || null);
            navigator.mediaSession.setActionHandler('nexttrack', onPlayNext || null);
        }
    }, [track.id])

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
            gsap.to(overlayRef.current, { opacity: 1, backdropFilter: isMobile ? 'blur(12px) saturate(120%)' : 'blur(32px) saturate(160%)', duration: 0.8, ease: 'power3.out' })
            gsap.to(bgRef.current, { opacity: 1, duration: 1.5, delay: 0.1, ease: 'power3.out' })

            gsap.to(containerRef.current, {
                top: 0, left: 0, xPercent: 0, x: 0,
                width: '100%', maxWidth: '100%', height: '100vh',
                borderRadius: 0, duration: 0.7, ease: 'expo.out'
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

            const targetHeight = isMobile ? 60 : 88
            const targetBottom = isMobile ? 20 : 36
            const targetTop = window.innerHeight - targetBottom - targetHeight

            gsap.to(containerRef.current, {
                top: targetTop,
                left: '50%',
                xPercent: -50,
                width: isMobile ? '82%' : '85%',
                maxWidth: '840px',
                height: targetHeight,
                borderRadius: isMobile ? '32px' : '32px',
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
                padding: isMobile ? '6px 14px' : '12px 36px',
                borderRadius: isMobile ? '20px' : '32px',
                background: isMobile ? 'rgba(14, 14, 20, 0.92)' : 'rgba(20, 20, 25, 0.45)',
                backdropFilter: isMobile ? 'blur(16px) saturate(140%)' : 'blur(50px) saturate(220%)',
                WebkitBackdropFilter: isMobile ? 'blur(16px) saturate(140%)' : 'blur(50px) saturate(220%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: isMobile ? '0 8px 24px rgba(0,0,0,0.6)' : '0 32px 64px -16px rgba(0, 0, 0, 0.7)',
                duration: 0.65,
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
        <div className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center">
            <div
                ref={overlayRef}
                onClick={() => setIsExpanded(false)}
                className={`absolute inset-0 bg-black/50 opacity-0 pointer-events-none transition-all`}
                style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
            />

            <div ref={bgRef} className="absolute inset-0 opacity-0 overflow-hidden pointer-events-none">
                {isMobile ? (
                    /* Solid gradient for mobile — clean, opaque, no see-through blobs */
                    <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(160deg, #0d0d1c 0%, #08080f 45%, #000000 100%)' }}
                    />
                ) : (
                    /* Animated blurred thumbnail blobs for desktop */
                    <>
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
                    </>
                )}
            </div>

            <div
                ref={containerRef}
                className="absolute bottom-5 md:bottom-9 w-[88%] md:w-[85%] max-w-[840px] h-[60px] md:h-[88px] pointer-events-auto"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
            >
                <audio
                    ref={audioRef}
                    src={src || undefined}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => onPlayNext?.()}
                    crossOrigin="anonymous"
                    autoPlay
                    playsInline
                    preload="auto"
                />

                <div
                    ref={barRef}
                    className="relative w-full h-full flex items-center shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-white/12 group/bar bg-transparent rounded-[32px]"
                    style={{ padding: isExpanded ? '0px' : (isMobile ? '6px 14px' : '12px 24px') }}
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
                            repeat={repeat}
                            showQueue={showQueue}
                            queue={queue}
                            onTogglePlay={togglePlay}
                            onSeek={handleSeek}
                            onSetIsExpanded={setIsExpanded}
                            onSetVoiceClarity={setVoiceClarity}
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
                            initial={{ opacity: 0, y: isExpanded ? 40 : 20, scale: 0.8, originY: 1 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: isExpanded ? 40 : 20, scale: 0.8 }}
                            className={`absolute w-[420px] max-h-[60vh] glass-panel rounded-[42px] p-8 flex flex-col z-[200] shadow-[0_48px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden ${isExpanded
                                ? 'bottom-56 left-1/2 -translate-x-1/2 origin-bottom'
                                : 'bottom-[110px] right-0 origin-bottom-right'
                                }`}
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
        <div className="w-full h-full flex items-center gap-3 relative">
            {/* LEFT: Playback Controls (Desktop only) */}
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

            {isMobile ? (
                /* ── MOBILE: clean, minimal strip — art | title + artist | play + next ── */
                <>
                    {/* Cover art — tap to expand fullscreen */}
                    <motion.div
                        onClick={() => onSetIsExpanded(true)}
                        className="relative shrink-0 w-10 h-10 rounded-full shadow-xl overflow-hidden border border-white/10 cursor-pointer active:scale-95 transition-transform"
                    >
                        <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                    </motion.div>

                    {/* Title + Artist — tap to expand */}
                    <div
                        onClick={() => onSetIsExpanded(true)}
                        className="flex-1 min-w-0 cursor-pointer"
                    >
                        <h4
                            className="font-black text-[13px] tracking-tight truncate text-white leading-snug"
                            dangerouslySetInnerHTML={{ __html: track.title }}
                        />
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate mt-0.5">
                            {track.channelTitle}
                        </p>
                    </div>

                    {/* Play + Next */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            onClick={e => { e.stopPropagation(); onTogglePlay() }}
                            disabled={isLoading}
                            className="bg-white text-black rounded-full flex items-center justify-center w-9 h-9 shadow-lg active:scale-90 transition-all"
                        >
                            {isLoading ? (
                                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : isPlaying ? (
                                <Pause weight="fill" className="w-4 h-4" />
                            ) : (
                                <Play weight="fill" className="w-4 h-4 translate-x-px" />
                            )}
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onPlayNext?.() }}
                            className="text-white/40 active:scale-90 transition-all"
                        >
                            <SkipForward weight="fill" className="w-5 h-5" />
                        </button>
                    </div>
                </>
            ) : (
                /* ── DESKTOP: island layout ── */
                <div
                    onClick={() => onSetIsExpanded(true)}
                    className="flex-1 min-w-0 flex items-center bg-white/[0.03] border-t border-white/[0.12] border-x border-white/[0.05] rounded-[40px] px-4 py-2 gap-4 hover:bg-white/[0.06] transition-all cursor-pointer group/island max-w-[440px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
                >
                    <motion.div
                        layoutId="track-art"
                        className="relative shrink-0 w-9 h-9 rounded-full shadow-xl overflow-hidden border border-white/10"
                    >
                        <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                    </motion.div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                        <h4
                            className="font-black tracking-tighter truncate text-white leading-tight text-xl"
                            dangerouslySetInnerHTML={{ __html: track.title }}
                        />
                        <div className="relative w-full h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white shadow-[0_0_10px_white]"
                                style={{ width: `${progress}%` }}
                                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 opacity-20 group-hover/island:opacity-100 transition-opacity">
                        <button className="p-1 hover:text-white text-white/40 transition-colors">
                            <DotsThree weight="bold" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* RIGHT: Utility Controls (Desktop only) */}
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
    voiceClarity, repeat, showQueue, queue,
    onTogglePlay, onSeek, onSetIsExpanded, onSetVoiceClarity, onSetRepeat, onSetShowQueue, onPlayNext, fmt, isMobile
}: any) {
    return (
        <div className={`w-full h-full relative overflow-hidden flex flex-col`}>
            {/* Mobile: animated album-art-matched background */}
            {isMobile && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {/* Animated blurred art — slow drift extracts ambient color */}
                    <motion.div
                        className="absolute inset-[-60px]"
                        animate={{
                            x: [0, 18, -12, 0],
                            y: [0, -14, 10, 0],
                            scale: [1.15, 1.22, 1.18, 1.15],
                        }}
                        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            backgroundImage: `url(${track.thumbnail})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(60px) saturate(200%) brightness(0.65)',
                        }}
                    />
                    {/* Minimal bottom vignette only — keeps text readable without killing colors */}
                    <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.55) 100%)' }}
                    />
                </div>
            )}

            <button
                onClick={() => onSetIsExpanded(false)}
                className={`absolute ${isMobile ? 'top-6 left-6 p-3 rounded-[24px]' : 'top-8 left-8 p-4 rounded-[28px]'} bg-white/5 backdrop-blur-xl hover:bg-white/10 text-white/40 hover:text-white transition-all z-30 group active:scale-90`}
            >
                <CaretDown weight="bold" className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} transform group-hover:translate-y-0.5 transition-transform`} />
            </button>

            <div className={`w-full h-full flex flex-col items-center justify-center ${isMobile ? 'gap-6 px-6' : 'gap-8 px-12'} max-w-5xl mx-auto py-10 relative z-10`}>

                <motion.div
                    layoutId={isMobile ? undefined : "track-art"}
                    initial={isMobile ? { opacity: 0, scale: 0.9 } : false}
                    animate={isMobile ? { opacity: 1, scale: 1 } : {}}
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
                            className={`font-black tracking-tighter truncate text-white leading-[1.1] ${isMobile ? 'text-2xl' : 'text-4xl'} drop-shadow-2xl px-4`}
                            dangerouslySetInnerHTML={{ __html: track.title }}
                        />
                        <p className={`font-black uppercase tracking-[0.4em] text-white/60 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>
                            {isLoading ? 'Decrypting Stream...' : track.channelTitle}
                        </p>
                    </div>

                    <div className="w-full max-w-3xl mx-auto space-y-8 md:space-y-10">
                        <div className="space-y-4 md:space-y-5">
                            <div className="relative group/progress">
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={progress || 0}
                                    onChange={onSeek}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="relative w-full h-1.5 md:h-3 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 group-hover/progress:h-2.5 md:group-hover/progress:h-4 transition-all duration-300">
                                    {/* Glowing Fill */}
                                    <motion.div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-white/40 via-white to-white/40 shadow-[0_0_20px_white]"
                                        initial={false}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                                    />
                                    {/* Pulsing Glow Effect */}
                                    <motion.div
                                        className="absolute top-0 right-0 w-12 h-full bg-white blur-md"
                                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{ left: `calc(${progress}% - 24px)` }}
                                    />
                                </div>
                                {/* Floating Thumb */}
                                <motion.div
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-[0_0_15px_white] border-2 border-white/20 opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none"
                                    animate={{ left: `calc(${progress}% - 10px)` }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] font-black tracking-[0.2em] text-white/30 uppercase">
                                <span>{fmt(currentTime)}</span>
                                <span>{fmt(duration)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 md:gap-8 mx-auto">
                            <ControlBtn
                                active={voiceClarity}
                                onClick={() => onSetVoiceClarity(!voiceClarity)}
                                icon={<MagicWand weight={voiceClarity ? "fill" : "light"} className={isMobile ? "w-6 h-6" : "w-7 h-7"} />}
                                label="Clarity"
                                isMobile={isMobile}
                            />
                            <ControlBtn
                                active={showQueue}
                                onClick={() => onSetShowQueue(!showQueue)}
                                icon={<List weight={showQueue ? "fill" : "light"} className={isMobile ? "w-6 h-6" : "w-7 h-7"} />}
                                label="Queue"
                                isMobile={isMobile}
                            />
                            <ControlBtn
                                active={repeat !== 'off'}
                                onClick={() => onSetRepeat((r: any) => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')}
                                icon={repeat === 'one' ? <RepeatOnce weight="fill" className={isMobile ? "w-6 h-6" : "w-7 h-7"} /> : <Repeat weight={repeat !== 'off' ? "fill" : "light"} className={isMobile ? "w-6 h-6" : "w-7 h-7"} />}
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
        </div>
    )
}

function ControlBtn({ active, onClick, icon, label, isMobile, disabled }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isMobile?: boolean, disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center ${isMobile ? 'gap-1.5 w-auto min-w-[64px] aspect-square p-2' : 'gap-2.5 w-24 aspect-square'} rounded-[32px] transition-all group active:scale-95 ${disabled ? 'opacity-20 cursor-not-allowed' : ''} ${active
                ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                : 'text-white/30 hover:text-white hover:bg-white/5'
                }`}
        >
            <div className={`${active ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'group-hover:scale-110'} transition-all duration-300`}>
                {icon}
            </div>
            <span className={`${isMobile ? 'text-[8px]' : 'text-[11px]'} font-accent uppercase tracking-[0.15em] ${active ? 'text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'text-white/20'}`}>{label}</span>
        </button>
    )
}

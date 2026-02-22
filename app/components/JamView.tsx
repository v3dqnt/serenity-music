'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '../../lib/supabase/client'
import SearchBar from './SearchBar'

interface JamViewProps {
    jamId: string
    user: any
    onLeave: () => void
}

export default function JamView({ jamId, user, onLeave }: JamViewProps) {
    const [queue, setQueue] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTrack, setCurrentTrack] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showInvite, setShowInvite] = useState(false)
    const [friends, setFriends] = useState<any[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const supabase = createClient()

    const fetchQueue = useCallback(async () => {
        const res = await fetch(`/api/jam/queue?jamId=${jamId}`)
        if (res.ok) {
            const data = await res.json()
            setQueue(data)
            if (!currentTrack && data.length > 0) {
                setCurrentTrack(data[0])
            }
        }
    }, [jamId, currentTrack])

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase
            .from('jam_members')
            .select('*, profiles:user_id(display_name, avatar_url)')
            .eq('jam_id', jamId)
        if (data) setMembers(data)
    }, [jamId])

    const fetchState = useCallback(async () => {
        const { data } = await supabase
            .from('jam_state')
            .select('*')
            .eq('jam_id', jamId)
            .single()

        if (data) {
            setIsPlaying(data.is_playing)
            if (data.current_track_id && (!currentTrack || currentTrack.track_id !== data.current_track_id)) {
                const track = queue.find(t => t.track_id === data.current_track_id)
                if (track) setCurrentTrack(track)
            }
        }
    }, [jamId, currentTrack, queue])

    const fetchFriends = useCallback(async () => {
        const res = await fetch('/api/friends')
        if (res.ok) {
            const data = await res.json()
            setFriends(data.filter((f: any) => f.status === 'accepted'))
        }
    }, [])

    useEffect(() => {
        fetchQueue()
        fetchState()
        fetchMembers()
        fetchFriends()

        const queueChannel = supabase
            .channel(`jam-queue-${jamId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jam_queue', filter: `jam_id=eq.${jamId}` }, () => {
                fetchQueue()
            })
            .subscribe()

        const stateChannel = supabase
            .channel(`jam-state-${jamId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jam_state', filter: `jam_id=eq.${jamId}` }, (payload: any) => {
                const newState = payload.new
                setIsPlaying(newState.is_playing)
                if (newState.current_track_id && (!currentTrack || currentTrack.track_id !== newState.current_track_id)) {
                    fetchQueue()
                }
            })
            .subscribe()

        const membersChannel = supabase
            .channel(`jam-members-${jamId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jam_members', filter: `jam_id=eq.${jamId}` }, () => {
                fetchMembers()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(queueChannel)
            supabase.removeChannel(stateChannel)
            supabase.removeChannel(membersChannel)
        }
    }, [jamId])

    useEffect(() => {
        if (!audioRef.current || !currentTrack) return
        if (isPlaying) {
            audioRef.current.play().catch(e => console.warn('Autoplay prevented:', e))
        } else {
            audioRef.current.pause()
        }
    }, [isPlaying, currentTrack])

    const handleAddToJamQueue = async (track: any) => {
        setLoading(true)
        try {
            await fetch('/api/jam/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jamId, track })
            })
        } finally {
            setLoading(false)
        }
    }

    const updateRemoteState = async (updates: any) => {
        await supabase
            .from('jam_state')
            .update(updates)
            .eq('jam_id', jamId)
    }

    const togglePlayback = () => {
        const nextState = !isPlaying
        setIsPlaying(nextState)
        updateRemoteState({ is_playing: nextState })
    }

    const playTrack = (track: any) => {
        setCurrentTrack(track)
        setIsPlaying(true)
        updateRemoteState({
            current_track_id: track.track_id,
            is_playing: true,
            position_ms: 0
        })
    }

    const copyJamLink = () => {
        const link = `${window.location.origin}/jam/${jamId}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const inviteFriend = async (friendId: string) => {
        await fetch('/api/jam/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jamId, friendId })
        })
    }

    // Filter out friends who are already members
    const memberIds = new Set(members.map(m => m.user_id))
    const invitableFriends = friends.filter(f => !memberIds.has(f.friend_id))

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-black p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 overflow-hidden"
        >
            {/* Audio Element (Hidden) */}
            {currentTrack && (
                <audio
                    ref={audioRef}
                    src={`/api/stream?id=${currentTrack.track_id}`}
                    onEnded={() => {
                        const idx = queue.findIndex(t => t.id === currentTrack.id)
                        if (idx !== -1 && idx < queue.length - 1) {
                            playTrack(queue[idx + 1])
                        }
                    }}
                />
            )}

            {/* Sidebar */}
            <div className="w-full md:w-80 shrink-0 space-y-6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Live Jam</h2>
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-2 px-1">Synchronized Session</p>
                    </div>
                    <button
                        onClick={onLeave}
                        className="p-3 rounded-2xl glass border border-white/5 text-white/20 hover:text-white hover:border-white/20 transition-all"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Members Strip */}
                <div className="glass-panel rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">In Session ({members.length})</span>
                        <button
                            onClick={() => setShowInvite(!showInvite)}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${showInvite ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                        >
                            + Invite
                        </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {members.map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-white/5">
                                <div className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[7px] font-black text-white/50">
                                    {m.profiles?.display_name?.[0] || '?'}
                                </div>
                                <span className="text-[9px] font-bold text-white/60">{m.profiles?.display_name || 'User'}</span>
                                {m.user_id === user.id && <span className="text-[7px] font-black text-white/20 uppercase">you</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invite Panel */}
                <AnimatePresence>
                    {showInvite && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
                                {/* Copy Link */}
                                <button
                                    onClick={copyJamLink}
                                    className="w-full flex items-center justify-between p-3 rounded-xl glass border border-white/5 hover:border-white/20 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">{copied ? 'Copied!' : 'Copy Invite Link'}</span>
                                    </div>
                                    {copied && (
                                        <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </button>

                                {/* Friend List */}
                                {invitableFriends.length > 0 ? (
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest px-1">Invite Friends</span>
                                        {invitableFriends.map(f => (
                                            <button
                                                key={f.friend_id}
                                                onClick={() => inviteFriend(f.friend_id)}
                                                className="w-full flex items-center justify-between p-3 rounded-xl glass border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/40">{f.friend_name?.[0]}</div>
                                                    <span className="text-xs font-bold text-white/60">{f.friend_name}</span>
                                                </div>
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Send</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest text-center py-2">Share the link above to invite people</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Now Playing in Jam */}
                <div className="glass-panel rounded-[40px] p-8 border border-white/10 relative overflow-hidden group">
                    {currentTrack ? (
                        <div className="relative z-10 space-y-6">
                            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                                <img src={currentTrack.thumbnail} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-white tracking-tight truncate">{currentTrack.title}</h3>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-2 truncate">{currentTrack.artist}</p>
                            </div>
                            <div className="flex items-center justify-center gap-6">
                                <button onClick={togglePlayback} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl">
                                    {isPlaying ? (
                                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    ) : (
                                        <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center opacity-20">
                            <svg className="w-12 h-12 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Vibe</p>
                            <p className="text-[8px] font-black uppercase tracking-widest mt-2 text-white/30">Search below to add tracks</p>
                        </div>
                    )}
                </div>

                {/* Search in Jam */}
                <div className="glass-panel rounded-[32px] p-6 border border-white/10 flex-1 flex flex-col min-h-0">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-6 px-2">Add to Queue</h3>
                    <div className="flex-1 overflow-hidden">
                        <SearchBar
                            onSelect={handleAddToJamQueue}
                            placeholder="Search tracks to add..."
                            variant="jam"
                        />
                    </div>
                </div>
            </div>

            {/* Main Queue Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
                <div className="glass-panel rounded-[48px] border border-white/5 flex-1 overflow-hidden flex flex-col p-10">
                    <div className="flex items-center justify-between mb-10 px-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Shared Queue ({queue.length})</h3>
                        </div>
                        <button
                            onClick={copyJamLink}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:border-white/20 transition-all"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            {copied ? 'Copied!' : 'Share'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                        {queue.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center">
                                <svg className="w-24 h-24 mb-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 21v-4M4 14l8-8 8 8M12 11V3" /></svg>
                                <p className="text-sm font-black uppercase tracking-[0.3em]">Session Empty</p>
                                <p className="text-xs mt-2 uppercase tracking-widest">Search for tracks in the sidebar</p>
                            </div>
                        ) : (
                            queue.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => playTrack(item)}
                                    className={`glass-panel border rounded-[32px] p-5 flex items-center gap-6 group hover:bg-white/5 transition-all cursor-pointer ${currentTrack?.id === item.id ? 'border-white/20 bg-white/[0.03]' : 'border-white/5'}`}
                                >
                                    <div className="relative w-16 h-16 rounded-[22px] overflow-hidden shrink-0 shadow-xl">
                                        <img src={item.thumbnail} className="w-full h-full object-cover" alt="" />
                                        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${currentTrack?.id === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {currentTrack?.id === item.id && isPlaying ? (
                                                <div className="flex gap-1 items-end h-4">
                                                    <div className="w-1 bg-white animate-[music-bar_0.6s_ease-in-out_infinite]" />
                                                    <div className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite]" />
                                                    <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite]" />
                                                </div>
                                            ) : (
                                                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-black tracking-tight truncate ${currentTrack?.id === item.id ? 'text-white text-lg' : 'text-white/60 text-base'}`}>{item.title}</h4>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1.5 truncate">{item.artist}</p>
                                    </div>
                                    <div className="px-6 py-2 rounded-full glass border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">#{idx + 1}</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBar from './SearchBar'

interface PlaylistsViewProps {
    libraryTracks: any[]
    onPlay: (track: any) => void
    currentTrackId?: string | null
    loadingTrackId?: string | null
    playlists: any[]
    onRefresh: () => void
}

export default function PlaylistsView({ libraryTracks, onPlay, currentTrackId, loadingTrackId, playlists, onRefresh }: PlaylistsViewProps) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [showAddTracks, setShowAddTracks] = useState(false)

    // Sync selected playlist details when playlists prop updates
    useEffect(() => {
        if (selectedPlaylist) {
            const updated = playlists.find(p => p.id === selectedPlaylist.id)
            if (updated) setSelectedPlaylist(updated)
        }
    }, [playlists, selectedPlaylist])

    const createPlaylist = async () => {
        if (!newName.trim()) return
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        })
        const created = await res.json()
        setNewName('')
        setShowCreate(false)
        setSelectedPlaylist(created)
        onRefresh()
    }

    const deletePlaylist = async (id: string) => {
        await fetch(`/api/playlists?id=${id}`, { method: 'DELETE' })
        if (selectedPlaylist?.id === id) setSelectedPlaylist(null)
        onRefresh()
    }

    const addTrack = async (track: any) => {
        if (!selectedPlaylist) return
        const res = await fetch('/api/playlists', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedPlaylist.id, addTrack: track }),
        })
        const updated = await res.json()
        setSelectedPlaylist(updated)
        onRefresh()
    }

    const removeTrack = async (trackId: string) => {
        if (!selectedPlaylist) return
        const res = await fetch('/api/playlists', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedPlaylist.id, removeTrackId: trackId }),
        })
        const updated = await res.json()
        setSelectedPlaylist(updated)
        onRefresh()
    }

    const tracksNotInPlaylist = libraryTracks.filter(
        t => !selectedPlaylist?.tracks.some((pt: any) => pt.id === t.id)
    )

    // Smart play: check library first, fall back to download
    const handlePlayTrack = async (track: any) => {
        const localMatch = libraryTracks.find(t => t.id === track.id)
        if (localMatch?.url) {
            // Already downloaded — play instantly with local URL
            onPlay({ ...track, url: localMatch.url, isLocal: true })
        } else {
            // Not local — trigger download via parent handlePlay
            await onPlay(track)
        }
    }

    return (
        <div className="w-full px-4 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 px-2">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">Playlists</h2>
                    <p className="text-sm text-white/40 font-medium mt-1">{playlists.length} curated collection{playlists.length !== 1 ? 's' : ''}</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreate(true)}
                    className="glass flex items-center gap-0 md:gap-2 px-3 py-3 md:px-6 md:py-3 text-white rounded-full text-sm font-black tracking-wide shadow-xl transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span className="hidden md:inline">NEW PLAYLIST</span>
                </motion.button>
            </div>

            {/* Create Playlist Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
                        onClick={() => setShowCreate(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-panel rounded-[40px] p-10 shadow-3xl w-full max-w-md relative overflow-hidden"
                            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                            <h3 className="text-2xl font-black text-white mb-6">Create New Playlist</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Playlist Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                                        placeholder="My Vibe..."
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 focus:border-white/40 focus:outline-none bg-white/5 text-white font-bold text-lg placeholder:text-white/20 transition-all"
                                    />
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 font-black text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={createPlaylist}
                                        className="flex-1 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 shadow-xl transition-all"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Tracks Modal */}
            <AnimatePresence>
                {showAddTracks && selectedPlaylist && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[100] flex items-center justify-center p-6"
                        onClick={() => setShowAddTracks(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-panel rounded-[48px] p-8 shadow-3xl w-full max-w-2xl max-h-[85vh] flex flex-col relative"
                            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div>
                                    <h3 className="text-2xl font-black text-white">Add Selection</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">To: {selectedPlaylist.name}</p>
                                </div>
                                <button
                                    onClick={() => setShowAddTracks(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full glass hover:bg-white/10 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>

                            <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar flex-1">
                                <SearchBar
                                    variant="mini"
                                    onPlay={(track) => addTrack(track)}
                                    onAddToQueue={() => { }} // Not used here
                                    loadingTrackId={loadingTrackId}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!playlists ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : selectedPlaylist ? (
                /* Playlist Detail View */
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    {/* Back + Title */}
                    <div className="flex items-center gap-6 mb-10 px-2">
                        <button
                            onClick={() => setSelectedPlaylist(null)}
                            className="w-12 h-12 flex items-center justify-center rounded-full glass border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <h3 className="text-3xl font-black text-white tracking-tight">{selectedPlaylist.name}</h3>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mt-1">{selectedPlaylist.tracks.length} curated track{selectedPlaylist.tracks.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedPlaylist.tracks.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePlayTrack(selectedPlaylist.tracks[0])}
                                    className="flex items-center justify-center w-12 h-12 bg-white text-black rounded-full shadow-xl hover:bg-white/90 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowAddTracks(true)}
                                className="w-12 h-12 flex items-center justify-center rounded-full glass border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            </motion.button>
                        </div>
                    </div>

                    {/* Track List */}
                    {selectedPlaylist.tracks.length === 0 ? (
                        <div className="text-center py-16 text-[var(--color-charcoal)]/50">
                            <div className="w-16 h-16 rounded-full bg-[var(--color-beige)]/40 flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                            </div>
                            <p className="font-semibold">No tracks yet</p>
                            <p className="text-sm mt-1">Tap "Add" to add songs from your library</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {selectedPlaylist.tracks.map((track: any, i: number) => {
                                const isLocal = libraryTracks.some(t => t.id === track.id)
                                const isLoadingThis = loadingTrackId === track.id
                                return (
                                    <motion.div
                                        key={track.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className={`flex items-center gap-5 p-4 rounded-[32px] group hover:bg-white/5 transition-all relative glass-panel mb-2 ${currentTrackId === track.id ? 'ring-2 ring-white/30 border-white/40' : 'border-white/5'}`}
                                    >
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-lg bg-black/40">
                                            {track.thumbnail ? (
                                                <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-black text-white truncate">{track.title}</p>
                                            <p className="text-xs font-medium text-white/40 truncate mt-0.5">{track.channelTitle}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isLocal && (
                                                <span className="shrink-0 text-[8px] font-black tracking-widest px-2.5 py-1 rounded-full glass border border-white/10 text-white/60">
                                                    AUTH
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handlePlayTrack(track)}
                                                disabled={isLoadingThis}
                                                className="w-10 h-10 flex items-center justify-center rounded-full glass border border-white/10 text-white hover:bg-white hover:text-black transition-all disabled:opacity-50"
                                            >
                                                {isLoadingThis ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => removeTrack(track.id)}
                                                className="w-10 h-10 flex items-center justify-center rounded-full glass border border-white/10 text-white/30 hover:text-red-400 hover:border-red-400/30 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </motion.div>
            ) : (
                /* Playlist Grid */
                playlists.length === 0 ? (
                    <div className="text-center py-20 text-[var(--color-charcoal)]/50">
                        <div className="w-20 h-20 rounded-full bg-[var(--color-beige)]/40 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        </div>
                        <p className="font-semibold text-lg">No playlists yet</p>
                        <p className="text-sm mt-1">Create your first playlist to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                        {playlists.map((playlist, i) => {
                            const thumbs = playlist.tracks.slice(0, 4).map((t: any) => t.thumbnail).filter(Boolean)
                            return (
                                <motion.div
                                    key={playlist.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="group relative glass-panel rounded-[40px] shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden cursor-pointer"
                                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                                    onClick={() => setSelectedPlaylist(playlist)}
                                >
                                    {/* Artwork grid */}
                                    <div className="aspect-square w-full bg-black/20 relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
                                        {thumbs.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center opacity-10">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
                                                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                                                </svg>
                                            </div>
                                        ) : thumbs.length < 4 ? (
                                            <img src={thumbs[0]} alt="" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                        ) : (
                                            <div className="grid grid-cols-2 w-full h-full">
                                                {thumbs.map((src: string, j: number) => (
                                                    <img key={j} src={src} alt="" className="w-full h-full object-cover border-[0.5px] border-black/20" />
                                                ))}
                                            </div>
                                        )}
                                        {/* Play overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 shadow-2xl scale-90 group-hover:scale-100">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 relative z-10">
                                        <h4 className="font-black text-xl text-white truncate tracking-tight">{playlist.name}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mt-1">{playlist.tracks.length} selection{playlist.tracks.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    {/* Delete button */}
                                    <button
                                        onClick={e => { e.stopPropagation(); deletePlaylist(playlist.id) }}
                                        className="absolute top-5 right-5 w-9 h-9 rounded-full glass border border-white/10 text-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80 hover:text-white hover:border-transparent"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                </motion.div>
                            )
                        })}
                    </div>
                )
            )}
        </div>
    )
}

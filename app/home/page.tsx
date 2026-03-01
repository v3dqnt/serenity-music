'use client'

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import NowPlayingBar from "../components/NowPlayingBar"
import CoverFlow from "../components/CoverFlow"
import PlaylistsView from "../components/PlaylistsView"
import PillNavbar from "../components/PillNavbar"
import SocialView from "../components/SocialView"
import ChartsView from "../components/ChartsView"
import { createClient } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getCachedBlobUrl, cacheAudioBlob, getLibrary, saveToLibrary } from '../lib/audioCache'
import BackgroundActivity from "../components/BackgroundActivity"
import BackgroundTitle from "../components/BackgroundTitle"
import ViewContent from "../components/ViewContent"

export default function Home() {
    const [selectedTrack, setSelectedTrack] = useState<any | null>(null)
    const [localUrl, setLocalUrl] = useState<string | null>(null)
    const [libraryTracks, setLibraryTracks] = useState<any[]>([])
    const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)
    const [playlists, setPlaylists] = useState<any[]>([])
    const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<any>(null)
    const [hasResults, setHasResults] = useState(false)
    const [view, setView] = useState<'home' | 'library' | 'playlists' | 'charts' | 'curated' | 'social'>('home')
    const [user, setUser] = useState<any>(null)
    const [queue, setQueue] = useState<any[]>([])
    const [activeTasks, setActiveTasks] = useState<any[]>([])
    const supabase = createClient()
    const router = useRouter()

    const fetchLibrary = useCallback(async () => {
        // 1. Get local history from IndexedDB
        const localTracks = await getLibrary()

        // 2. Try to get server history if logged in
        let serverTracks: any[] = []
        try {
            const res = await fetch('/api/recently-played')
            if (res.ok) {
                const data = await res.json()
                serverTracks = data.map((t: any) => ({
                    id: t.track_id,
                    title: t.title,
                    channelTitle: t.channel_title,
                    thumbnail: t.thumbnail,
                    addedAt: t.played_at,
                    enhanced: true
                }))
            }
        } catch (e) {
            console.warn('Failed to fetch server history:', e)
        }

        // 3. Merge and deduplicate
        const merged = [...localTracks]
        serverTracks.forEach(st => {
            if (!merged.some(lt => lt.id === st.id)) {
                merged.push(st)
            }
        })

        // 4. Sort by date
        const sorted = merged.sort((a, b) =>
            new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        )

        setLibraryTracks(sorted)
    }, [])

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [supabase.auth])

    const handleLogout = async () => {
        localStorage.removeItem('serenity_last_track') // Clear session on logout
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const fetchPlaylists = useCallback(async () => {
        try {
            const res = await fetch('/api/playlists')
            if (res.ok) {
                const data = await res.json()
                setPlaylists(data)
            }
        } catch (e) {
            console.warn('Failed to fetch playlists:', e)
        }
    }, [])

    useEffect(() => {
        fetchLibrary()
        fetchPlaylists()
    }, [])

    // Sync a track to both local IndexedDB and Supabase recently_played
    const syncTrackActivity = useCallback((track: any) => {
        if (!track?.id) return

        // Save to local IndexedDB library
        saveToLibrary({
            id: track.id,
            title: track.title || `Track ${track.id}`,
            channelTitle: track.channelTitle || 'Unknown Artist',
            thumbnail: track.thumbnail || '',
            addedAt: new Date().toISOString(),
            enhanced: true,
        }).then(() => fetchLibrary())

        // Sync to Supabase for friend activity / cross-device
        fetch('/api/recently-played', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(track)
        }).catch(e => console.warn('Failed to sync history:', e))
    }, [fetchLibrary])

    // Restore last session track + sync it
    useEffect(() => {
        const saved = localStorage.getItem('serenity_last_track')
        if (saved && !selectedTrack) {
            try {
                const track = JSON.parse(saved)
                setSelectedTrack(track)
                syncTrackActivity(track) // Sync restored track
                getCachedBlobUrl(track.id).then(url => {
                    if (url) setLocalUrl(url)
                })
            } catch (e) {
                console.warn('Failed to restore session:', e)
            }
        }
    }, [syncTrackActivity])

    const handlePlay = async (track: any) => {
        let activeTrack = { ...track }

        // 1. Resolve track ID if it's missing (Billboard/Shazam charts)
        if (track.needsResolution || !track.id) {
            setLoadingTrackId(track.id || 'resolving')
            const taskId = Math.random().toString(36).substring(7)
            const resolveTask = { id: taskId, track, type: 'resolving', status: 'loading' }

            setActiveTasks(prev => [...prev, resolveTask])

            try {
                console.log(`[Playback] Resolving external track: ${track.title} by ${track.channelTitle}`)
                const query = `${track.title} ${track.channelTitle} official`
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                if (res.ok) {
                    const data = await res.json()
                    const bestMatch = data.web?.[0]
                    if (bestMatch) {
                        activeTrack = {
                            ...track,
                            id: bestMatch.id,
                            thumbnail: track.thumbnail || bestMatch.thumbnail,
                            needsResolution: false
                        }
                        console.log(`[Playback] Resolved to YouTube ID: ${bestMatch.id}`)
                    } else {
                        throw new Error('No match found on YouTube')
                    }
                }
                // Update task to done before removing
                setActiveTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t))
                setTimeout(() => setActiveTasks(prev => prev.filter(t => t.id !== taskId)), 1500)
            } catch (e) {
                console.error('Failed to resolve track:', e)
                setActiveTasks(prev => prev.filter(t => t.id !== taskId))
                alert(`Serenity couldn't find a high-quality match for "${track.title}" on YouTube.`)
                setLoadingTrackId(null)
                return
            }
        }

        // Switch UI to the active track
        setSelectedTrack(activeTrack)
        // Note: We used to call setLocalUrl(null) here, but we removed it 
        // to keep current playback alive until the stream buffers.
        setLoadingTrackId(activeTrack.id)

        // Sync Session Memory (Local)
        localStorage.setItem('serenity_last_track', JSON.stringify(activeTrack))

        // Sync to IndexedDB + Supabase history
        syncTrackActivity(activeTrack)

        try {
            // STEP A: Check for cached version first
            const cachedUrl = await getCachedBlobUrl(activeTrack.id)
            if (cachedUrl) {
                console.log(`[Playback] Playing from local cache: ${activeTrack.id}`)
                setLocalUrl(cachedUrl)
                setLoadingTrackId(null)

                if (queue.length > 0) handlePreDownload(queue[0])
                return
            }

            // STEP B: Start playback IMMEDIATELY using the stream API
            console.log(`[Playback] Starting immediate direct stream for ${activeTrack.id}`)
            setLocalUrl(`/api/stream?videoId=${activeTrack.id}`)
            setLoadingTrackId(null)

            // STEP C: In the background, trigger the full download for permanent caching
            const downloadTaskId = Math.random().toString(36).substring(7)
            setActiveTasks(prev => [...prev, { id: downloadTaskId, track: activeTrack, type: 'caching', status: 'loading' }])

            fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: activeTrack.id,
                    title: activeTrack.title,
                    channelTitle: activeTrack.channelTitle,
                    thumbnail: activeTrack.thumbnail,
                })
            }).then(async (response) => {
                if (response.ok) {
                    const mimeType = response.headers.get('Content-Type') || 'audio/mp4'
                    const blob = await response.blob()
                    await cacheAudioBlob(activeTrack.id, blob, mimeType)
                    console.log(`[Playback] Track successfully cached in background: ${activeTrack.id}`)

                    // Mark as done
                    setActiveTasks(prev => prev.map(t => t.id === downloadTaskId ? { ...t, status: 'done' } : t))
                    setTimeout(() => setActiveTasks(prev => prev.filter(t => t.id !== downloadTaskId)), 2000)
                } else {
                    setActiveTasks(prev => prev.filter(t => t.id !== downloadTaskId))
                }
            }).catch(e => {
                console.warn('[Playback] Background caching failed:', e)
                setActiveTasks(prev => prev.filter(t => t.id !== downloadTaskId))
            })

            // STEP D: Pre-fetch the next track in the queue
            if (queue.length > 0) {
                setTimeout(() => handlePreDownload(queue[0]), 2000)
            }

        } catch (error) {
            console.error('Error handling play:', error)
            setLoadingTrackId(null)
        }
    }

    const addToQueue = (track: any) => {
        setQueue(prev => [...prev, track])
    }

    const handlePlayNext = () => {
        if (queue.length > 0) {
            const nextTrack = queue[0]
            setQueue(prev => prev.slice(1))
            handlePlay(nextTrack)
        }
    }

    const handlePreDownload = async (track: any) => {
        if (!track || track.needsResolution) return
        const cachedUrl = await getCachedBlobUrl(track.id)
        if (cachedUrl) return

        if (activeTasks.some(t => t.track.id === track.id)) return

        const taskId = Math.random().toString(36).substring(7)
        setActiveTasks(prev => [...prev, { id: taskId, track, type: 'caching', status: 'loading' }])

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: track.id,
                    title: track.title,
                    channelTitle: track.channelTitle,
                    thumbnail: track.thumbnail,
                })
            })

            if (response.ok) {
                const mimeType = response.headers.get('Content-Type') || 'audio/mp4'
                const blob = await response.blob()
                await cacheAudioBlob(track.id, blob, mimeType)
                await saveToLibrary({
                    id: track.id,
                    title: track.title || `Track ${track.id}`,
                    channelTitle: track.channelTitle || 'Unknown Artist',
                    thumbnail: track.thumbnail || '',
                    addedAt: new Date().toISOString(),
                    enhanced: true,
                })
                fetchLibrary()
                setActiveTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t))
                setTimeout(() => setActiveTasks(prev => prev.filter(t => t.id !== taskId)), 2000)
            } else {
                setActiveTasks(prev => prev.filter(t => t.id !== taskId))
            }
        } catch (error) {
            console.error('[AudioCache] Pre-cache failed:', error)
            setActiveTasks(prev => prev.filter(t => t.id !== taskId))
        }
    }

    const addToPlaylist = async (playlistId: string, track: any) => {
        try {
            const res = await fetch('/api/playlists', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: playlistId,
                    addTrack: {
                        id: track.id,
                        title: track.title,
                        channelTitle: track.channelTitle,
                        thumbnail: track.thumbnail,
                        addedAt: new Date().toISOString()
                    }
                })
            })
            if (res.ok) {
                setTrackToAddToPlaylist(null)
                fetchPlaylists()
            }
        } catch (error) {
            console.error('Failed to add to playlist:', error)
        }
    }

    return (
        <main className="min-h-screen text-white flex flex-col relative bg-black overflow-x-hidden">
            {/* Subtle background */}
            <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(60,60,80,0.5) 0%, transparent 70%)', filter: 'blur(80px)' }} />
                <div className="absolute bottom-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(40,40,60,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            </div>

            {/* Pill Navbar */}
            <PillNavbar
                view={view}
                setView={setView}
                user={user}
                handleLogout={handleLogout}
                handlePlay={handlePlay}
                addToQueue={addToQueue}
                setTrackToAddToPlaylist={setTrackToAddToPlaylist}
                selectedTrackId={selectedTrack?.id}
                loadingTrackId={loadingTrackId}
            />

            {/* Background Branding Title */}
            <BackgroundTitle
                text={view === 'home' ? 'Recents' : view}
                visible={view === 'home' && libraryTracks.length > 0}
            />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-6 flex flex-col items-center min-h-screen">

                {/* Content Area */}
                <div className="w-full">
                    {/* Library View */}
                    {view === 'library' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="library-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`w-full ${selectedTrack ? 'mb-32 md:mb-48' : 'mb-20 md:mb-32'}`}
                            >
                                <div className="text-center mb-10">
                                    <h2 className="heading-lg text-white">Downloads</h2>
                                    <p className="label-caps opacity-40 mt-2">{libraryTracks.length} tracks saved locally</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                    {libraryTracks.map((track) => (
                                        <motion.div
                                            key={track.id}
                                            className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer glass-card shadow-2xl shadow-white/5"
                                            onClick={() => handlePlay(track)}
                                            whileHover={{ scale: 1.03, y: -4 }}
                                        >
                                            {track.thumbnail && (
                                                <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-white/10">
                                                    {loadingTrackId === track.id ? (
                                                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 w-full p-3 md:p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                                <h3 className="text-white font-semibold text-xs md:text-sm truncate mb-0.5">{track.title}</h3>
                                                <p className="label-caps !text-[8px] md:!text-[9px] !tracking-[0.1em] opacity-40 truncate">{track.channelTitle}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Home View */}
                    {view === 'home' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="home-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`w-full relative transition-all duration-500 ${selectedTrack ? 'mt-6 md:mt-12 mb-24 md:mb-48 md:scale-90 origin-top' : 'mt-6 md:mt-20 mb-4 md:mb-32'}`}
                            >
                                {libraryTracks.length > 0 ? (
                                    <CoverFlow tracks={libraryTracks.slice(0, 7)} onSelect={handlePlay} activeTrackId={selectedTrack?.id} loadingTrackId={loadingTrackId} libraryTracks={libraryTracks} />
                                ) : (
                                    <div className="text-center py-20 text-white/30">
                                        <p className="font-semibold">No songs played yet.</p>
                                        <p className="text-sm mt-1">Search for music above to get started.</p>
                                    </div>
                                )}

                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Charts View */}
                    {view === 'charts' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="charts-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`w-full transition-all duration-500 ${selectedTrack ? 'mt-2 md:mt-4 mb-32 md:mb-48 md:scale-95 origin-top' : 'mt-4 md:mt-6 mb-24 md:mb-32'}`}
                            >
                                <ChartsView
                                    onPlay={handlePlay}
                                    currentTrackId={selectedTrack?.id}
                                    loadingTrackId={loadingTrackId}
                                />
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* Curated View */}
                    {view === 'curated' && (
                        <ViewContent
                            title="Curated"
                            subtitle="Handpicked vibes"
                        >
                            <div className="w-full text-center py-40 modular-item opacity-0">
                                <div className="w-20 h-20 rounded-full glass border border-white/10 flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-8 h-8 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <h3 className="heading-xl text-white uppercase !text-3xl">Coming Soon</h3>
                                <p className="label-caps opacity-40 mt-3 px-12 leading-relaxed max-w-lg mx-auto">This section is coming in a future update. Stay tuned for handpicked vibes.</p>
                                <button
                                    onClick={() => setView('home')}
                                    className="mt-10 px-8 py-3 rounded-full glass border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Back to Home
                                </button>
                            </div>
                        </ViewContent>
                    )}

                    {/* Social View */}
                    {view === 'social' && (
                        <SocialView
                            user={user}
                            onPlay={handlePlay}
                            currentTrackId={selectedTrack?.id}
                            loadingTrackId={loadingTrackId}
                        />
                    )}

                    {/* Playlists View */}
                    {view === 'playlists' && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="playlists-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`w-full transition-all duration-500 ${selectedTrack ? 'mt-2 md:mt-4 mb-32 md:mb-48 md:scale-90 origin-top' : 'mt-4 md:mt-6 mb-24 md:mb-32'}`}
                            >
                                <PlaylistsView
                                    libraryTracks={libraryTracks}
                                    onPlay={handlePlay}
                                    currentTrackId={selectedTrack?.id}
                                    loadingTrackId={loadingTrackId}
                                    playlists={playlists}
                                    onRefresh={fetchPlaylists}
                                />
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Modals and Overlays */}
            <AnimatePresence>
                {trackToAddToPlaylist && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6" onClick={() => setTrackToAddToPlaylist(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-panel rounded-[40px] p-8 shadow-3xl w-full max-w-sm relative"
                            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-widest">Add to Playlist</h3>
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {playlists.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => addToPlaylist(p.id, trackToAddToPlaylist)}
                                        className="w-full p-4 rounded-2xl glass hover:bg-white/10 text-left transition-all border border-white/5 group"
                                    >
                                        <p className="font-bold text-white group-hover:translate-x-1 transition-transform">{p.name}</p>
                                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">{p.tracks?.length || 0} tracks</p>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setTrackToAddToPlaylist(null)}
                                className="w-full mt-6 py-4 text-white/40 font-black text-xs uppercase tracking-widest hover:text-white transition-all underline decoration-white/10 underline-offset-8"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedTrack && (
                    <NowPlayingBar
                        track={selectedTrack}
                        src={localUrl || null}
                        isLoading={!!loadingTrackId}
                        queue={queue}
                        onClose={() => {
                            setSelectedTrack(null)
                            setLocalUrl(null)
                            setQueue([])
                        }}
                        onPlayNext={handlePlayNext}
                        onAlmostDone={() => {
                            if (queue.length > 0) handlePreDownload(queue[0])
                        }}
                        onAddToPlaylist={(track) => setTrackToAddToPlaylist(track)}
                    />
                )}
            </AnimatePresence>

            <BackgroundActivity tasks={activeTasks} />
        </main>
    )
}

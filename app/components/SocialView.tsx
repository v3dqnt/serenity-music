'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ViewContent from './ViewContent'

interface SocialViewProps {
    user: any
    onPlay: (track: any) => void
    currentTrackId?: string | null
    loadingTrackId?: string | null
}

export default function SocialView({ user, onPlay, currentTrackId, loadingTrackId }: SocialViewProps) {
    const [friends, setFriends] = useState<any[]>([])
    const [activity, setActivity] = useState<any[]>([])
    const [jamInvites, setJamInvites] = useState<any[]>([])
    const [syncing, setSyncing] = useState(false)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)

    const [showAddForm, setShowAddForm] = useState(false)
    const [showManage, setShowManage] = useState(false)
    const [newFriendId, setNewFriendId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [copiedUid, setCopiedUid] = useState(false)

    // Fetch friends list only (lightweight, on mount)
    const fetchFriends = useCallback(async () => {
        try {
            const friendsRes = await fetch('/api/friends')
            if (friendsRes.ok) setFriends(await friendsRes.json())

            const inviteRes = await fetch('/api/jam/invite')
            if (inviteRes.ok) setJamInvites(await inviteRes.json())
        } catch (e) {
            console.error('Failed to fetch friends:', e)
        }
    }, [])

    // Sync: Pull friend activity from database on demand
    const syncActivity = useCallback(async () => {
        setSyncing(true)
        try {
            const activityRes = await fetch('/api/friends?activity=true')
            if (activityRes.ok) {
                const data = await activityRes.json()
                setActivity(data)
                setLastSynced(new Date())
            }
        } catch (e) {
            console.error('Failed to sync activity:', e)
        } finally {
            setSyncing(false)
        }
    }, [])

    // Fetch friends on mount, auto-sync activity once
    useEffect(() => {
        fetchFriends()
        syncActivity()
    }, [fetchFriends, syncActivity])


    const acceptJamInvite = async (invite: any) => {
        const res = await fetch('/api/jam/invite', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteId: invite.id, jamId: invite.jam_id, action: 'accept' })
        })
        if (res.ok) {
            window.open(`/jam/${invite.jam_id}`, '_blank')
            fetchFriends()
        }
    }

    const inviteToJam = async (friendId: string) => {
        const jamRes = await fetch('/api/jam')
        let jamIdToInviteTo = null
        if (jamRes.ok) {
            const data = await jamRes.json()
            if (data.jam) jamIdToInviteTo = data.jam.id
        }

        if (!jamIdToInviteTo) {
            const res = await fetch('/api/jam', { method: 'POST' })
            if (res.ok) {
                const data = await res.json()
                jamIdToInviteTo = data.id
                window.open(`/jam/${jamIdToInviteTo}`, '_blank')
            }
        }

        if (jamIdToInviteTo) {
            await fetch('/api/jam/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jamId: jamIdToInviteTo, friendId })
            })
        }
    }

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newFriendId.trim()) return
        setLoading(true)
        try {
            const res = await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId: newFriendId.trim() })
            })
            if (res.ok) {
                setSuccess('Request sent!')
                setNewFriendId('')
                fetchFriends()
                setTimeout(() => setShowAddForm(false), 2000)
            } else {
                const d = await res.json()
                setError(d.error)
            }
        } finally { setLoading(false) }
    }

    const acceptFriend = async (id: string) => {
        await fetch('/api/friends', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendshipId: id })
        })
        fetchFriends()
    }

    const deleteConnection = async (id: string) => {
        await fetch(`/api/friends?id=${id}`, { method: 'DELETE' })
        fetchFriends()
    }

    const timeAgo = (date: string) => {
        const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.round(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        return `${Math.round(hrs / 24)}d ago`
    }

    const activeFriends = friends.filter(f => f.status === 'accepted')
    const friendRequests = friends.filter(f => f.status === 'pending' && f.direction === 'received')

    const handleCopyUid = () => {
        if (!user?.id) return
        navigator.clipboard.writeText(user.id)
        setCopiedUid(true)
        setTimeout(() => setCopiedUid(false), 2000)
    }

    const socialAction = (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={handleCopyUid}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${copiedUid ? 'bg-white/10 text-white border-white/20' : 'glass text-white/30 border-white/5 hover:border-white/20 hover:text-white/60'}`}
            >
                {copiedUid ? (
                    <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        Copied!
                    </>
                ) : (
                    <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        Copy UID
                    </>
                )}
            </button>
            <button onClick={() => { setShowAddForm(!showAddForm); setShowManage(false); }} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${showAddForm ? 'bg-white text-black border-white shadow-xl shadow-white/10' : 'glass text-white/40 border-white/5 hover:border-white/20'}`}>+ Add Friend</button>
            <button onClick={() => { setShowManage(!showManage); setShowAddForm(false); }} className={`relative px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${showManage ? 'bg-white text-black border-white shadow-xl shadow-white/10' : 'glass text-white/40 border-white/5 hover:border-white/20'}`}>
                Manage
                {friendRequests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black border-2 border-black rounded-full text-[8px] flex items-center justify-center font-black">{friendRequests.length}</span>}
            </button>
        </div>
    )

    return (
        <ViewContent
            title="Social"
            subtitle="Listening with friends"
            action={socialAction}
            refreshKey={activity.length + friends.length + (syncing ? 1 : 0)}
        >
            {/* Global error display */}
            {error && !showAddForm && (
                <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold modular-item opacity-0">
                    {error}
                </div>
            )}

            <AnimatePresence>
                {showAddForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-12">
                        <div className="glass-panel rounded-[32px] p-8 border border-white/10 bg-white/[0.02]">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Connect with a UID</h3>
                            <form onSubmit={handleAddFriend} className="flex flex-col sm:flex-row gap-4">
                                <input type="text" value={newFriendId} onChange={e => setNewFriendId(e.target.value)} placeholder="Paste UID..." className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white focus:outline-none focus:border-white/30 transition-all" />
                                <button type="submit" disabled={loading} className="px-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Add</button>
                            </form>
                            {error && <p className="text-red-400 text-[10px] font-black uppercase mt-4 ml-2">{error}</p>}
                            {success && <p className="text-white/60 text-[10px] font-black uppercase mt-4 ml-2">{success}</p>}
                        </div>
                    </motion.div>
                )}

                {showManage && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-12 space-y-8">
                        {/* Jam Invites */}
                        {jamInvites.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-widest ml-4">Jam Invites</h3>
                                {jamInvites.map(inv => (
                                    <div key={inv.id} className="glass-panel rounded-3xl p-5 flex items-center justify-between border border-white/10 bg-white/[0.04] animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-black text-xs">{inv.host?.display_name?.[0]}</div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{inv.host?.display_name}</h4>
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-1">Invited you to {inv.jams?.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => acceptJamInvite(inv)} className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase">Join</button>
                                            <button className="px-4 py-2 rounded-xl glass border border-white/10 text-white/30 text-[10px] font-black uppercase">Ignore</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Friend Requests */}
                        {friendRequests.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-widest ml-4">Requests</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {friendRequests.map(req => (
                                        <div key={req.friendship_id} className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black text-[10px]">{req.friend_name?.[0]}</div>
                                                <h4 className="font-bold text-white text-xs truncate">{req.friend_name}</h4>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => acceptFriend(req.friendship_id)} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg></button>
                                                <button onClick={() => deleteConnection(req.friendship_id)} className="w-8 h-8 rounded-full glass border border-white/10 text-white/30 flex items-center justify-center"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friends List (w/ Jam Invite buttons) */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Your Friends</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeFriends.map(friend => (
                                    <div key={friend.friendship_id} className="glass-panel rounded-2xl p-4 flex items-center justify-between border border-white/5 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px]">{friend.friend_name?.[0]}</div>
                                            <h4 className="font-bold text-white text-xs">{friend.friend_name}</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => inviteToJam(friend.friend_id)} className="md:opacity-0 md:group-hover:opacity-100 px-3 py-1.5 rounded-lg border border-white/10 text-[8px] font-black uppercase text-white/40 hover:text-white hover:border-white/20 transition-all">Invite</button>
                                            <button onClick={() => deleteConnection(friend.friendship_id)} className="md:opacity-0 md:group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Friend Activity Feed */}
            <div className="space-y-8">
                <div className="flex items-center justify-center gap-4 mb-8 modular-item opacity-0">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em] opacity-50">Friend Activity</h3>
                    <button
                        onClick={syncActivity}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${syncing ? 'border-white/10 text-white/20' : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70 hover:bg-white/5 active:scale-95'}`}
                    >
                        <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m0 0a9 9 0 0 1 9-9m-9 9a9 9 0 0 0 9 9" />
                        </svg>
                        {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                    {lastSynced && (
                        <span className="text-[8px] font-black text-white/15 uppercase tracking-widest">
                            {timeAgo(lastSynced.toISOString())}
                        </span>
                    )}
                </div>
                {activity.length === 0 ? (
                    <div className="py-32 text-center glass-panel rounded-[48px] border border-dashed border-white/5 flex flex-col items-center justify-center bg-white/[0.01] modular-item opacity-0">
                        <div className="w-16 h-16 rounded-full glass border border-white/5 flex items-center justify-center mb-6 opacity-20"><svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-widest px-8 leading-relaxed text-center">No recent activity. Hit Sync to check what your friends are vibing to.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activity.map((item: any) => {
                            const trackObj = {
                                id: item.track_id,
                                title: item.track_title,
                                channelTitle: item.track_artist,
                                thumbnail: item.track_thumbnail
                            }
                            const isLoadingThis = loadingTrackId === item.track_id && item.track_id !== null
                            const isSelected = currentTrackId === item.track_id && item.track_id !== null

                            return (
                                <div
                                    key={item.friend_id + (item.track_id || '')}
                                    className={`modular-item opacity-0 glass-panel rounded-[32px] overflow-hidden border transition-all group relative aspect-[1.8/1] flex flex-col justify-end p-4 md:p-6 cursor-pointer ${isSelected ? 'border-white/40 ring-2 ring-white/10' : 'border-white/10 hover:border-white/20'}`}
                                    onClick={() => onPlay(trackObj)}
                                >
                                    {item.track_thumbnail && <div className="absolute inset-0 pointer-events-none"><img src={item.track_thumbnail} alt="" className="w-full h-full object-cover scale-110 blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity duration-700" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" /></div>}

                                    {/* Play Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl shadow-white/10 scale-90 group-hover:scale-100 transition-transform duration-500">
                                            {isLoadingThis ? (
                                                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-[8px] font-black">{item.friend_name?.[0]}</div>
                                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{item.friend_name} was vibing to</span>
                                            {item.played_at && (
                                                <span className="ml-auto text-[8px] font-black text-white/20 uppercase tracking-widest">
                                                    {timeAgo(item.played_at)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-end gap-4">
                                            {item.track_thumbnail && <img src={item.track_thumbnail} className="w-16 h-16 rounded-2xl shadow-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform duration-500" alt="" />}
                                            <div className="flex-1 min-w-0 pb-1">
                                                <h4 className="font-black text-white text-lg truncate tracking-tight">{item.track_title}</h4>
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1 truncate">{item.track_artist}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </ViewContent>
    )
}

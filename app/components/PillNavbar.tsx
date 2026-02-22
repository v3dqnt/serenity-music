'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBar from './SearchBar'
import { User, SignOut, Copy, Check, List as ListIcon, X } from '@phosphor-icons/react'

interface PillNavbarProps {
    view: 'home' | 'library' | 'playlists' | 'charts' | 'curated' | 'social'
    setView: (view: 'home' | 'library' | 'playlists' | 'charts' | 'curated' | 'social') => void
    user: any
    handleLogout: () => void
    handlePlay: (track: any) => void
    addToQueue: (track: any) => void
    setTrackToAddToPlaylist: (track: any) => void
    selectedTrackId?: string | null
    loadingTrackId?: string | null
}

export default function PillNavbar({
    view,
    setView,
    user,
    handleLogout,
    handlePlay,
    addToQueue,
    setTrackToAddToPlaylist,
    selectedTrackId,
    loadingTrackId
}: PillNavbarProps) {
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const navItems = ['home', 'playlists', 'charts', 'curated', 'social'] as const

    return (
        <div className="w-full flex justify-center sticky top-8 z-[120] px-4 mb-16">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass rounded-full px-2 py-2 md:px-3 md:py-3 flex items-center gap-1 md:gap-1.5 shadow-2xl backdrop-blur-[40px]"
            >
                {/* Hamburger Button (Mobile only - Left) */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-full glass border border-white/10 text-white mr-1"
                >
                    <ListIcon weight="bold" className="w-5 h-5" />
                </button>

                {/* Search Bar (Nav variant) */}
                <div className="px-0.5 md:px-1 flex-1 md:flex-none">
                    <SearchBar
                        variant="nav"
                        onPlay={handlePlay}
                        onAddToQueue={addToQueue}
                        onAddToPlaylist={setTrackToAddToPlaylist}
                        currentTrackId={selectedTrackId}
                        loadingTrackId={loadingTrackId}
                        onResults={(count: number) => {
                            if (count > 0) setView('home')
                        }}
                    />
                </div>

                {/* Nav Items (Desktop only) */}
                <div className="hidden md:flex items-center gap-0.5 px-1 md:px-2 border-l border-white/10 ml-0.5 md:ml-1">
                    {navItems.map((item) => (
                        <button
                            key={item}
                            onClick={() => setView(item)}
                            className={`relative px-3 py-2.5 md:px-6 md:py-3.5 rounded-full nav-text transition-all duration-300 ${view === item
                                ? 'text-white'
                                : 'text-white/30 hover:text-white'
                                }`}
                        >
                            <span className="relative z-10 capitalize text-[10px] md:text-xs">{item}</span>
                            {view === item && (
                                <motion.div
                                    layoutId="navbar-active-tab"
                                    className="absolute inset-0 rounded-full glass border-t border-white/30 shadow-2xl bg-white/10"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Account Section (Desktop only) */}
                <div className="hidden md:block relative border-l border-white/10 pl-2 ml-1">
                    <button
                        onClick={() => setShowUserMenu(v => !v)}
                        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-bold text-sm hover:border-white/40 hover:bg-white/10 transition-all shadow-inner"
                    >
                        {user?.user_metadata?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 12 }}
                                className="absolute right-0 top-14 w-60 glass-panel rounded-3xl shadow-3xl overflow-hidden z-[150] p-2"
                                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                            >
                                <div className="px-4 py-4 border-b border-white/5 mb-1">
                                    <p className="font-black text-xs text-white truncate tracking-tight">{user?.user_metadata?.display_name || 'Listener'}</p>
                                    <p className="text-[9px] font-bold text-white/30 truncate mt-1">{user?.email}</p>
                                </div>

                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(user?.id || '')
                                            const btn = document.getElementById('copy-uid-btn')
                                            if (btn) {
                                                const original = btn.innerHTML
                                                btn.innerHTML = 'Copied!'
                                                setTimeout(() => { btn.innerHTML = original }, 2000)
                                            }
                                        }}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all group"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Copy weight="bold" className="w-3.5 h-3.5" />
                                            UID: {user?.id?.slice(0, 8)}...
                                        </span>
                                        <span id="copy-uid-btn" className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-red-500/10 transition-all group"
                                    >
                                        <SignOut weight="bold" className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
                                        Log out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Sidebar Sidebar (Mobile) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-[200] overflow-hidden">
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Sidebar */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute top-0 left-0 h-full w-[280px] bg-[#0a0a0c] border-r border-white/10 shadow-2xl p-6 flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                                        {user?.user_metadata?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <h2 className="text-sm font-black uppercase tracking-[0.1em] text-white leading-none">Account</h2>
                                </div>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full glass border border-white/10 text-white/40 hover:text-white"
                                >
                                    <X weight="bold" className="w-5 h-5" />
                                </button>
                            </div>

                            <nav className="flex flex-col gap-2 flex-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => {
                                            setView(item)
                                            setIsSidebarOpen(false)
                                        }}
                                        className={`w-full text-left px-6 py-4 rounded-2xl nav-text transition-all duration-300 flex items-center justify-between ${view === item
                                            ? 'bg-white/10 text-white shadow-lg border border-white/10'
                                            : 'text-white/30 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="capitalize font-black tracking-widest text-sm">{item}</span>
                                        {view === item && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                        )}
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-bold text-xs">
                                        {user?.user_metadata?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xs text-white truncate">{user?.user_metadata?.display_name || 'Listener'}</p>
                                        <p className="text-[9px] font-bold text-white/30 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        handleLogout()
                                        setIsSidebarOpen(false)
                                    }}
                                    className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-red-500/10 transition-all group"
                                >
                                    <SignOut weight="bold" className="w-4 h-4 group-hover:text-red-400" />
                                    Log out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

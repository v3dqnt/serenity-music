'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CloudArrowDown, MagicWand, CheckCircle } from '@phosphor-icons/react'

interface BackgroundActivityProps {
    tasks: any[]
}

export default function BackgroundActivity({ tasks }: BackgroundActivityProps) {
    if (tasks.length === 0) return null

    return (
        <div className="fixed top-20 left-4 right-4 md:top-auto md:bottom-32 md:left-auto md:right-8 flex flex-col gap-3 z-[500] items-center md:items-end pointer-events-none">
            <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                    <motion.div
                        key={task.id + task.type}
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="glass-panel px-4 py-3 rounded-2xl flex items-center gap-4 bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl min-w-[240px] max-w-sm pointer-events-auto"
                    >
                        <div className="relative shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                            {task.track.thumbnail ? (
                                <img src={task.track.thumbnail} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                    <CloudArrowDown className="text-white/20" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                {task.status === 'done' ? (
                                    <CheckCircle weight="fill" className="text-green-400 w-5 h-5" />
                                ) : (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-black text-white/90 truncate uppercase tracking-tight">
                                {task.track.title}
                            </h4>
                            <p className="text-[9px] font-bold text-white/30 truncate mt-1 uppercase tracking-widest">
                                {task.type === 'caching' ? 'Caching for Offline' : 'Resolving Metadata'}
                            </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            {task.type === 'caching' ? (
                                <CloudArrowDown weight="fill" className="text-white/20 w-4 h-4" />
                            ) : (
                                <MagicWand weight="fill" className="text-white/20 w-4 h-4" />
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

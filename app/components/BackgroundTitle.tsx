'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface BackgroundTitleProps {
    text: string
    visible: boolean
}

export default function BackgroundTitle({ text, visible }: BackgroundTitleProps) {
    return (
        <div className="fixed inset-0 pointer-events-none select-none z-[0] flex items-center justify-center overflow-hidden">
            <AnimatePresence>
                {visible && (
                    <motion.h2
                        key={text}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 0.02, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.1, y: -20 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="text-[18vw] md:text-[28vw] font-black uppercase tracking-tighter text-white whitespace-nowrap leading-none select-none hidden md:block"
                    >
                        {text}
                    </motion.h2>
                )}
            </AnimatePresence>
        </div>
    )
}

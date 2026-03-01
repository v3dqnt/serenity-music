'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { animate, stagger } from 'animejs'

interface ViewContentProps {
    title: string
    subtitle?: string
    children: ReactNode
    action?: ReactNode
    staggerDelay?: number
    refreshKey?: any
}

export default function ViewContent({
    title,
    subtitle,
    children,
    action,
    staggerDelay = 50,
    refreshKey
}: ViewContentProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Staggered entrance animation for all direct children of the grid/content area
        const elements = containerRef.current.querySelectorAll('.modular-item')

        animate(elements, {
            translateY: [30, 0],
            opacity: [0, 1],
            scale: [0.95, 1],
            delay: stagger(staggerDelay),
            duration: 800,
            easing: 'easeOutElastic(1, .8)'
        })

        // Header animation
        const header = containerRef.current.querySelector('.view-header')
        if (header) {
            animate(header, {
                translateY: [-20, 0],
                opacity: [0, 1],
                duration: 1000,
                easing: 'easeOutExpo'
            })
        }
    }, [title, staggerDelay, refreshKey])

    return (
        <div ref={containerRef} className="w-full px-4 md:px-6 pb-28 md:pb-32">
            {/* Standardized Header */}
            <div className="view-header flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-16 gap-4 md:gap-6 px-2 opacity-0">
                <div className="text-center md:text-left">
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">{title}</h2>
                    {subtitle && (
                        <p className="text-white/30 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] mt-2 md:mt-4">{subtitle}</p>
                    )}
                </div>
                {action && (
                    <div className="flex justify-center md:justify-end">
                        {action}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="w-full">
                {children}
            </div>
        </div>
    )
}

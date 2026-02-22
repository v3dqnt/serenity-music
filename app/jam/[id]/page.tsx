'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '../../../lib/supabase/client'
import JamView from '../../components/JamView'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function JamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: jamId } = use(params)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setError('Please login to join this jam')
                setLoading(false)
                return
            }
            setUser(user)
            setLoading(false)
        }
        checkAuth()
    }, [supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Access Denied</h1>
                <p className="text-white/40 mb-8">{error}</p>
                <Link href="/auth" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl">Login</Link>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-black">
            <JamView
                jamId={jamId}
                user={user}
                onLeave={() => window.close()}
            />
        </main>
    )
}

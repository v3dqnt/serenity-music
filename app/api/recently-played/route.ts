import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

async function getClientAndUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { supabase, user: null }
    return { supabase, user }
}

export async function GET() {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
        .from('recently_played')
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const track = await request.json()

    const { data, error } = await supabase
        .from('recently_played')
        .upsert({
            user_id: user.id,
            track_id: track.id,
            title: track.title,
            channel_title: track.channelTitle,
            thumbnail: track.thumbnail,
            played_at: new Date().toISOString()
        }, { onConflict: 'user_id,track_id' })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

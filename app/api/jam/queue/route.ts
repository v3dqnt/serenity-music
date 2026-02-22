import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server' // Fixed path

async function getClientAndUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { supabase, user: null }
    return { supabase, user }
}

export async function POST(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jamId, track } = await request.json()

    const { data, error } = await supabase
        .from('jam_queue')
        .insert({
            jam_id: jamId,
            track_id: track.id,
            title: track.title,
            artist: track.channelTitle,
            thumbnail: track.thumbnail,
            added_by: user.id
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function GET(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const jamId = searchParams.get('jamId')

    const { data, error } = await supabase
        .from('jam_queue')
        .select('*')
        .eq('jam_id', jamId)
        .order('added_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

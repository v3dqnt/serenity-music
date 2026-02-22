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

    // Get active jam for the user
    const { data: membership, error: memberError } = await supabase
        .from('jam_members')
        .select('jam_id, jams(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })
    if (!membership) return NextResponse.json({ jam: null })

    return NextResponse.json({ jam: membership.jams, membership })
}

export async function POST(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name } = await request.json().catch(() => ({}))

    // 1. Create Jam
    const { data: jam, error: jamError } = await supabase
        .from('jams')
        .insert({ host_id: user.id, name: name || 'Midnight Session' })
        .select()
        .single()

    if (jamError) return NextResponse.json({ error: jamError.message }, { status: 500 })

    // 2. Join as Host
    await supabase.from('jam_members').insert({ jam_id: jam.id, user_id: user.id })

    // 3. Init State
    await supabase.from('jam_state').insert({ jam_id: jam.id })

    return NextResponse.json(jam)
}

import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server' // Fixed path

async function getClientAndUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { supabase, user: null }
    return { supabase, user }
}

export async function GET() {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch pending invites for me
    const { data, error } = await supabase
        .from('jam_invites')
        .select('*, jams(name), host:profiles!sender_id(display_name)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jamId, friendId } = await request.json()

    const { data, error } = await supabase
        .from('jam_invites')
        .insert({
            jam_id: jamId,
            sender_id: user.id,
            receiver_id: friendId
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function PATCH(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { inviteId, jamId, action } = await request.json()

    if (action === 'accept') {
        // 1. Update invite
        await supabase.from('jam_invites').update({ status: 'accepted' }).eq('id', inviteId)

        // 2. Join Jam
        const { error: joinError } = await supabase
            .from('jam_members')
            .insert({ jam_id: jamId, user_id: user.id })

        if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } else {
        await supabase.from('jam_invites').update({ status: 'declined' }).eq('id', inviteId)
        return NextResponse.json({ success: true })
    }
}

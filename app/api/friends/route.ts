import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

async function getClientAndUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { supabase, user: null }
    return { supabase, user }
}

export async function GET(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const getActivity = searchParams.get('activity') === 'true'

    if (getActivity) {
        const { data, error } = await supabase
            .from('friend_activity')
            .select('*')
            .eq('user_id', user.id)
            .order('played_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    }

    // Default: fetch friends list
    const { data, error } = await supabase
        .from('friend_details')
        .select('*')
        .eq('observer_id', user.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { friendId } = await request.json()

    if (!friendId) return NextResponse.json({ error: 'Friend UID is required' }, { status: 400 })
    if (friendId === user.id) return NextResponse.json({ error: 'You cannot add yourself' }, { status: 400 })

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(friendId)) {
        return NextResponse.json({ error: 'Invalid UID format' }, { status: 400 })
    }

    // Check if the user exists
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', friendId)
        .maybeSingle()

    if (profileError || !profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Insert with 'pending' status (default in DB)
    const { data, error } = await supabase
        .from('friends')
        .insert({ user_id: user.id, friend_id: friendId, status: 'pending' })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Request already exists' }, { status: 400 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { friendshipId } = await request.json()

    const { data, error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .eq('friend_id', user.id) // Only the receiver can accept
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(request: Request) {
    const { supabase, user } = await getClientAndUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const friendshipId = searchParams.get('id')

    const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

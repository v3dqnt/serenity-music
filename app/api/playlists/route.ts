import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// Helper: get supabase client + authenticated user, return 401 if not authed
async function getClientAndUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { supabase, user: null };
    return { supabase, user };
}

// GET — fetch all playlists for the current user
export async function GET() {
    const { supabase, user } = await getClientAndUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// POST — create a new playlist
export async function POST(request: Request) {
    const { supabase, user } = await getClientAndUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name: name.trim(), tracks: [] })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}

// PATCH — update a playlist (rename, add track, remove track)
export async function PATCH(request: Request) {
    const { supabase, user } = await getClientAndUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, name, addTrack, removeTrackId } = body;

    // Fetch current playlist (RLS ensures it belongs to this user)
    const { data: playlist, error: fetchError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let updatedTracks: any[] = playlist.tracks ?? [];
    let updatedName: string = playlist.name;

    if (name) updatedName = name.trim();
    if (addTrack) {
        const already = updatedTracks.some((t: any) => t.id === addTrack.id);
        if (!already) updatedTracks = [...updatedTracks, addTrack];
    }
    if (removeTrackId) {
        updatedTracks = updatedTracks.filter((t: any) => t.id !== removeTrackId);
    }

    const { data: updated, error: updateError } = await supabase
        .from('playlists')
        .update({ name: updatedName, tracks: updatedTracks })
        .eq('id', id)
        .select()
        .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json(updated);
}

// DELETE — delete a playlist
export async function DELETE(request: Request) {
    const { supabase, user } = await getClientAndUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

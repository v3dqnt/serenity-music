import { NextResponse } from 'next/server';

const REGIONS = [
    { code: 'US', name: 'USA' },
    { code: 'GB', name: 'UK' },
    { code: 'IN', name: 'India' },
    { code: 'KR', name: 'S. Korea' },
    { code: 'JP', name: 'Japan' },
    { code: 'BR', name: 'Brazil' },
    { code: 'FR', name: 'France' },
];

const SOURCES = [
    { id: 'youtube', name: 'YouTube Trending' },
    { id: 'billboard', name: 'Billboard Hot 100' },
    { id: 'shazam', name: 'Shazam/Apple Top 100' },
    { id: 'spotify', name: 'Spotify Top 50' },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'youtube';
    const regionCode = searchParams.get('region') || 'US';
    const apiKey = process.env.YOUTUBE_API_KEY;

    try {
        if (source === 'spotify' && apiKey) {
            console.log('[Charts] Fetching Spotify Global Top 50 via YouTube...');
            // We search for the current Spotify Top 50 playlist on YouTube
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=Spotify+Global+Top+50&type=playlist&maxResults=1&key=${apiKey}`
            );
            const searchData = await res.json();
            const playlistId = searchData.items?.[0]?.id?.playlistId;

            if (playlistId) {
                const itemsRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`
                );
                const itemsData = await itemsRes.json();
                return NextResponse.json({
                    source: 'spotify',
                    tracks: itemsData.items.map((item: any, idx: number) => ({
                        id: item.snippet.resourceId.videoId,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                        channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
                        rank: idx + 1,
                        isLocal: false,
                    }))
                });
            }
        }

        if (source === 'billboard') {
            console.log('[Charts] Fetching Billboard Hot 100...');
            const res = await fetch('https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/recent.json');
            if (!res.ok) throw new Error('Failed to fetch Billboard data');
            const data = await res.json();

            return NextResponse.json({
                source: 'billboard',
                tracks: data.data.slice(0, 50).map((t: any) => ({
                    id: null, // No video ID yet
                    title: t.title,
                    channelTitle: t.artist,
                    thumbnail: null, // We'll search for this later or use a placeholder
                    viewCount: null,
                    rank: t.rank,
                    isLocal: false,
                    needsResolution: true // Flag to tell frontend to search for video ID
                }))
            });
        }

        if (source === 'shazam') {
            console.log('[Charts] Fetching Shazam/iTunes RSS...');
            const res = await fetch(`https://itunes.apple.com/${regionCode}/rss/topsongs/limit=50/json`);
            if (!res.ok) throw new Error('Failed to fetch Shazam data');
            const data = await res.json();

            return NextResponse.json({
                source: 'shazam',
                tracks: data.feed.entry.map((e: any, idx: number) => ({
                    id: null,
                    title: e['im:name'].label,
                    channelTitle: e['im:artist'].label,
                    thumbnail: e['im:image'][2].label, // High res image
                    viewCount: null,
                    rank: idx + 1,
                    isLocal: false,
                    needsResolution: true
                }))
            });
        }

        // Default: YouTube
        if (!apiKey) throw new Error('YouTube API Key missing');

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&videoCategoryId=10&regionCode=${regionCode}&maxResults=50&key=${apiKey}`
        );

        const data = await response.json();
        if (!response.ok) throw new Error('YouTube API Error');

        return NextResponse.json({
            source: 'youtube',
            region: regionCode,
            tracks: data.items.map((item: any, idx: number) => ({
                id: item.id,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                channelTitle: item.snippet.channelTitle,
                viewCount: item.statistics.viewCount,
                rank: idx + 1,
                isLocal: false,
            }))
        });

    } catch (error: any) {
        console.error('Charts Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

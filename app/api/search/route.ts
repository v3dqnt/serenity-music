import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const libraryFile = path.join(process.cwd(), 'data', 'library.json');

// --- Apple Music Helper (iTunes API) ---
async function searchAppleMusic(query: string) {
    try {
        // Using iTunes Search API with increased limit and specific music focus
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15&country=us`);

        if (!res.ok) {
            console.error('[Apple Music] Search API Error:', res.status);
            return [];
        }

        const data = await res.json();
        return (data.results || []).map((track: any) => ({
            id: `apple-${track.trackId}`, // Prefix to avoid collisions
            title: track.trackName,
            channelTitle: track.artistName,
            thumbnail: track.artworkUrl100.replace('100x100', '1000x1000'), // Massive high-res artwork
            isLocal: false,
            needsResolution: true,
            source: 'apple',
            album: track.collectionName,
            duration: track.trackTimeMillis / 1000
        }));
    } catch (e) {
        console.error('[Apple Music] Search Request Error:', e);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    // Search local library
    let localResults: any[] = [];
    try {
        if (fs.existsSync(libraryFile)) {
            const data = JSON.parse(fs.readFileSync(libraryFile, 'utf-8'));
            const q = query.toLowerCase();
            localResults = data
                .filter((t: any) =>
                    t.title?.toLowerCase().includes(q) ||
                    t.channelTitle?.toLowerCase().includes(q)
                )
                .map((t: any) => ({ ...t, isLocal: true, localUrl: t.url }));
        }
    } catch (e) {
        console.error('Local library search error:', e);
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    // --- Run searches in parallel ---
    const tasks = [searchAppleMusic(query)];

    if (apiKey) {
        tasks.push(
            fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
                    query + " official audio"
                )}&type=video&videoCategoryId=10&key=${apiKey}&maxResults=10`
            ).then(res => res.json())
        );
    } else {
        tasks.push(Promise.resolve({ items: [] }));
    }

    try {
        const [appleResults, youtubeData] = await Promise.all(tasks);

        let webResults = [];
        if (youtubeData && youtubeData.items) {
            webResults = youtubeData.items
                .filter((item: any) => {
                    if (!item.id?.videoId) return false;
                    const title = item.snippet.title.toLowerCase();
                    // Filter out non-official variants
                    const isLyrical = title.includes('lyrics') || title.includes('lyrical');
                    const isKaraoke = title.includes('karaoke');
                    const isCover = title.includes('cover') && !title.includes('official cover');
                    return !isLyrical && !isKaraoke && !isCover;
                })
                .slice(0, 10) // Limit to top 10 after filtering
                .map((item: any) => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.medium.url,
                    channelTitle: item.snippet.channelTitle,
                    isLocal: false,
                }));
        }

        return NextResponse.json({
            local: localResults,
            apple: appleResults || [],
            web: webResults
        });

    } catch (error) {
        console.error('Search Fetch Error:', error);
        return NextResponse.json({ local: localResults, apple: [], web: [] });
    }
}

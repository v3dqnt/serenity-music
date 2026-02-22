import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

/**
 * Serenity Download API
 * ---------------------
 * Fetches the full audio stream and pipes it to the browser.
 * The browser then handles permanent storage in IndexedDB.
 * No local disk I/O used, which ensures compatibility with Vercel.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle } = body;

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        console.log(`[download] Fetching: ${videoId}`);
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Create the ytdl stream
        const stream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
        });

        // Convert Node.js Readable stream to Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk));
                stream.on('end', () => controller.close());
                stream.on('error', (err) => controller.error(err));
            },
            cancel() {
                stream.destroy();
            }
        });

        const mimeType = 'audio/mp4';

        return new Response(webStream, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'X-Track-Id': videoId,
                'X-Track-Mime': mimeType,
                'X-Track-Title': encodeURIComponent(title || ''),
                'X-Track-Artist': encodeURIComponent(channelTitle || ''),
            },
        });

    } catch (error: any) {
        console.error('[download] Error:', error);
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}

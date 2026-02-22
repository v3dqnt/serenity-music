import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

/**
 * Serenity Streaming API
 * ----------------------
 * Uses @distube/ytdl-core to stream audio directly from YouTube.
 * Works on Vercel and local environments without needing Python/yt-dlp.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Use ytdl-core to get the audio stream
        // We filter for the best audio-only format that is likely to be an m4a/aac container
        const stream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25, // 32mb buffer to keep the stream smooth
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

        return new Response(webStream, {
            headers: {
                'Content-Type': 'audio/mp4', // Most highestaudio formats are mp4/aac
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (error: any) {
        console.error('[stream] Error:', error);
        return NextResponse.json({ error: `Streaming failed: ${error.message}` }, { status: 500 });
    }
}

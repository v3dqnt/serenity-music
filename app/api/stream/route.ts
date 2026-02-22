import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

/**
 * Serenity Streaming API
 * ----------------------
 * Pipes yt-dlp output directly to the browser for near-instant playback.
 * Skips enhancement and disk I/O.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // yt-dlp command to stream bestaudio to stdout
    const args = [
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-', // stream to stdout
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    const ytDlp = spawn('python', ['-m', 'yt_dlp', ...args]);

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk) => {
                controller.enqueue(chunk);
            });

            ytDlp.stderr.on('data', (data) => {
                console.error(`[stream] yt-dlp error: ${data}`);
            });

            ytDlp.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[stream] yt-dlp exited with code ${code}`);
                }
                controller.close();
            });

            ytDlp.on('error', (err) => {
                console.error(`[stream] spawn error: ${err}`);
                controller.error(err);
            });
        },
        cancel() {
            ytDlp.kill();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mp4',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
        },
    });
}

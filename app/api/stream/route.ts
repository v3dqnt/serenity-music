import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

/**
 * Serenity Streaming API (Python Reversion)
 * ---------------------------------------
 * Reverted to yt-dlp via Python as requested.
 * Optimized for Vercel compatibility by checking for python3.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Try python3 first (standard on Vercel/Linux), fallback to python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    console.log(`[stream] Spawning ${pythonCmd} for ${videoId}`);

    const args = [
        '-m', 'yt_dlp',
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    const ytDlp = spawn(pythonCmd, args);

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk) => controller.enqueue(chunk));

            ytDlp.stderr.on('data', (data) => {
                const msg = data.toString();
                if (msg.includes('ERROR')) console.error(`[stream] yt-dlp error: ${msg}`);
            });

            ytDlp.on('close', (code) => {
                if (code !== 0) console.error(`[stream] yt-dlp exited with code ${code}`);
                controller.close();
            });

            ytDlp.on('error', (err) => {
                console.error(`[stream] Spawn error (${pythonCmd}):`, err);
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

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

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

    // Use local binary in production (downloaded in build step), fallback to system command
    const localBin = path.join(process.cwd(), 'bin', 'yt-dlp');
    const ytDlpPath = existsSync(localBin) ? localBin : (process.platform === 'win32' ? 'python' : 'python3');

    // If using the binary directly, we don't need the '-m yt_dlp' args
    const isBinary = ytDlpPath === localBin;
    const spawnCmd = isBinary ? ytDlpPath : ytDlpPath;
    const baseArgs = isBinary ? [] : ['-m', 'yt_dlp'];

    console.log(`[stream] Spawning ${ytDlpPath} for ${videoId}`);

    const args = [
        ...baseArgs,
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    const ytDlp = spawn(spawnCmd, args);

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
                console.error(`[stream] Spawn error (${ytDlpPath}):`, err);
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

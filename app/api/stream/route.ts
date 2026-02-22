import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Standalone Binary Version)
 * ------------------------------------------------
 * Executes the self-contained yt-dlp Linux binary.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Binary location
    const cwd = process.cwd();
    const binaryPath = path.join(cwd, 'lib/yt-dlp');

    // Fallback for local development (if you still have python locally)
    const isVercel = process.env.VERCEL === '1';
    const hasBinary = fs.existsSync(binaryPath);

    let spawnCmd = hasBinary ? binaryPath : (process.platform === 'win32' ? 'python' : 'python3');
    let baseArgs: string[] = (!hasBinary) ? ['-m', 'yt_dlp'] : [];

    // On Vercel, ensure it's executable
    if (hasBinary && isVercel) {
        try { fs.chmodSync(binaryPath, '755'); } catch (e) { }
    }

    console.log(`[stream] Spawning ${spawnCmd} for ${videoId}`);

    const args = [
        ...baseArgs,
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--no-part',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(spawnCmd, args);
    } catch (e: any) {
        return NextResponse.json({ error: `Spawn failed: ${e.message}`, path: binaryPath }, { status: 500 });
    }

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk: any) => controller.enqueue(chunk));

            ytDlp.stderr.on('data', (data: any) => {
                console.error(`[stream] yt-dlp stderr: ${data.toString()}`);
            });

            ytDlp.on('close', (code: number) => {
                console.log(`[stream] yt-dlp exited with code ${code}`);
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                controller.error(err);
            });
        },
        cancel() {
            try { ytDlp.kill(); } catch { }
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

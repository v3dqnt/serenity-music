import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync, chmodSync } from 'fs';

/**
 * Serenity Streaming API (Python Reversion)
 * ---------------------------------------
 * Reverted to yt-dlp via Python as requested.
 * Optimized for Vercel compatibility by using a bundled binary.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Use local binary in production (downloaded in build step), fallback to system command
    // We check both the old 'bin' and the new 'lib/bin' just in case
    const localBinPaths = [
        path.join(process.cwd(), 'lib/bin/yt-dlp'),
        path.join(process.cwd(), 'bin/yt-dlp'),
        // On Vercel, the file might be in a different relative location
        path.join(process.cwd(), '.next/server/vendor/yt-dlp'),
    ];

    let ytDlpPath = '';
    for (const p of localBinPaths) {
        if (existsSync(p)) {
            ytDlpPath = p;
            break;
        }
    }

    const isBinary = ytDlpPath !== '';
    const spawnCmd = isBinary ? ytDlpPath : (process.platform === 'win32' ? 'python' : 'python3');
    const baseArgs = isBinary ? [] : ['-m', 'yt_dlp'];

    console.log(`[stream] Attempting to spawn: ${spawnCmd} ${baseArgs.join(' ')} for ${videoId}`);

    // Ensure it's executable if it's a binary
    if (isBinary && process.platform !== 'win32') {
        try {
            chmodSync(ytDlpPath, '755');
        } catch (e) {
            console.warn(`[stream] Could not chmod 755 ${ytDlpPath}:`, e);
        }
    }

    const args = [
        ...baseArgs,
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(spawnCmd, args);
    } catch (e: any) {
        console.error(`[stream] Failed to spawn ${spawnCmd}:`, e);
        return NextResponse.json({ error: `Spawn failed: ${e.message}`, path: ytDlpPath }, { status: 500 });
    }

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk: any) => controller.enqueue(chunk));

            ytDlp.stderr.on('data', (data: any) => {
                const msg = data.toString();
                if (msg.includes('ERROR')) console.error(`[stream] yt-dlp error: ${msg}`);
            });

            ytDlp.on('close', (code: number) => {
                if (code !== 0) console.error(`[stream] yt-dlp exited with code ${code}`);
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                console.error(`[stream] Process error:`, err);
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

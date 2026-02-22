import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Binary Version - Advanced Anti-Bot)
 * ----------------------------------------------------
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const binaryPath = path.join(process.cwd(), 'lib/yt-dlp');
    const hasBinary = fs.existsSync(binaryPath);

    const spawnCmd = hasBinary ? binaryPath : (process.platform === 'win32' ? 'python' : 'python3');
    const baseArgs = !hasBinary ? ['-m', 'yt_dlp'] : [];

    const env = {
        ...process.env,
        HOME: '/tmp',
        PYTHONUNBUFFERED: '1'
    };

    if (hasBinary && process.env.VERCEL === '1') {
        try { fs.chmodSync(binaryPath, '755'); } catch (e) { }
    }

    // Advanced Anti-bot strategies:
    // 1. Force Android Music client (currently very robust)
    // 2. Force IPv4 (Cloud IPv6 is often banned)
    // 3. Use an embed URL as the source (sometimes bypasses checks)
    const args = [
        ...baseArgs,
        '--format', 'ba[ext=m4a]/ba',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--no-part',
        '--no-cache-dir',
        '--force-ipv4',
        '--extractor-args', 'youtube:player-client=android_music,android,ios',
        '--user-agent', 'Mozilla/5.0 (Android 14; Mobile; rv:122.0) Gecko/122.0 Firefox/122.0',
        '--geo-bypass',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(spawnCmd, args, { env });
    } catch (e: any) {
        return NextResponse.json({ error: `Spawn failed: ${e.message}` }, { status: 500 });
    }

    let errorOutput = '';
    ytDlp.stderr.on('data', (data: any) => {
        errorOutput += data.toString();
    });

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk: any) => {
                controller.enqueue(chunk);
            });

            ytDlp.on('close', (code: number) => {
                if (code !== 0) {
                    console.error(`[stream] Runtime error for ${videoId}: ${errorOutput}`);
                }
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                controller.error(err);
            });
        },
        cancel() {
            try { ytDlp.kill('SIGKILL'); } catch { }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mp4',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive',
        },
    });
}

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Binary Version - Read-Only Fix)
 * ----------------------------------------------------
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const binaryPath = path.join(process.cwd(), 'lib/yt-dlp');
    const sourceCookiesPath = path.join(process.cwd(), 'lib/cookies.txt');
    const targetCookiesPath = '/tmp/cookies.txt';
    const hasBinary = fs.existsSync(binaryPath);
    const hasSourceCookies = fs.existsSync(sourceCookiesPath);

    // Choose command
    const spawnCmd = hasBinary ? binaryPath : (process.platform === 'win32' ? 'python' : 'python3');
    const baseArgs = !hasBinary ? ['-m', 'yt_dlp'] : [];

    // Environment setup to prevent yt-dlp from trying to write to read-only home
    const env = {
        ...process.env,
        HOME: '/tmp',
        PYTHONUNBUFFERED: '1'
    };

    if (hasBinary && process.env.VERCEL === '1') {
        try { fs.chmodSync(binaryPath, '755'); } catch (e) { }
    }

    // Vercel fix: Copy cookies to /tmp since yt-dlp tries to update them (ReadOnly FS error)
    let activeCookiesPath = null;
    if (hasSourceCookies) {
        try {
            const cookieContent = fs.readFileSync(sourceCookiesPath, 'utf8');
            fs.writeFileSync(targetCookiesPath, cookieContent);
            activeCookiesPath = targetCookiesPath;
            console.log(`[stream] Cookies copied to ${targetCookiesPath}`);
        } catch (e: any) {
            console.error(`[stream] Cookie copy failed: ${e.message}`);
        }
    }

    console.log(`[stream] Spawning ${spawnCmd} for ${videoId}`);

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
        // 'ios' client skips cookies, so we use web/android
        '--extractor-args', 'youtube:player-client=web,android,mweb',
        '--geo-bypass',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    if (activeCookiesPath) {
        args.push('--cookies', activeCookiesPath);
    }

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
                console.error(`[stream] process error: ${err.message}`);
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

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Binary + JS Runtime + TV Bypass)
 * ----------------------------------------------------
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const cwd = process.cwd();
    const libPath = path.join(cwd, 'lib');
    const binaryPath = path.join(libPath, 'yt-dlp');
    const denoPath = path.join(libPath, 'deno');
    const sourceCookiesPath = path.join(libPath, 'cookies.txt');
    const targetCookiesPath = '/tmp/cookies_stream.txt';

    const hasBinary = fs.existsSync(binaryPath) && process.platform !== 'win32';
    const hasSourceCookies = fs.existsSync(sourceCookiesPath);

    // Choose command
    const spawnCmd = hasBinary ? binaryPath : (process.platform === 'win32' ? 'python' : 'python3');
    const baseArgs = !hasBinary ? ['-m', 'yt_dlp'] : [];

    // Environment setup
    // Ensure lib is in PATH so yt-dlp finds 'deno' for signature solving
    const env = {
        ...process.env,
        PATH: `${libPath}${path.delimiter}${process.env.PATH}`,
        HOME: '/tmp',
        PYTHONUNBUFFERED: '1'
    };

    if (hasBinary && process.env.VERCEL === '1') {
        try { fs.chmodSync(binaryPath, '755'); } catch (e) { }
        if (fs.existsSync(denoPath)) {
            try { fs.chmodSync(denoPath, '755'); } catch (e) { }
        }
    }

    if (hasSourceCookies && process.env.VERCEL === '1') {
        try { fs.copyFileSync(sourceCookiesPath, targetCookiesPath); } catch (e) { }
    }

    console.log(`[stream] Spawning ${spawnCmd} for ${videoId}`);

    const args = [
        ...baseArgs,
        ...(hasSourceCookies ? ['--cookies', process.env.VERCEL === '1' ? targetCookiesPath : sourceCookiesPath] : []),
        // Prioritize Hi-Fi audio (160kbps+). Opus/AAC from TV clients is usually premium quality.
        '--format', 'bestaudio[abr>=160]/bestaudio[ext=m4a][abr>=128]/bestaudio/best',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--no-part',
        '--no-cache-dir',
        '--force-ipv4',
        // iOS and Web are currently the most reliable for bypassing blocks with the latest yt-dlp.
        // TV fails with DRM, iOS fails with PO token. We use web_creator which has no PO token JS checks.
        '--extractor-args', 'youtube:player-client=web_creator,default',
        '--geo-bypass',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

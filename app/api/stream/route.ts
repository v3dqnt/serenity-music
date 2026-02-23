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

    const hasBinary = fs.existsSync(binaryPath);
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

    // Copy cookies to writable /tmp
    let activeCookiesPath = null;
    if (hasSourceCookies) {
        try {
            const cookieContent = fs.readFileSync(sourceCookiesPath, 'utf8');
            fs.writeFileSync(targetCookiesPath, cookieContent);
            activeCookiesPath = targetCookiesPath;
        } catch (e: any) {
            console.error(`[stream] Cookie copy failed: ${e.message}`);
        }
    }

    console.log(`[stream] Spawning ${spawnCmd} for ${videoId}`);

    const args = [
        ...baseArgs,
        // Prioritize 128kbps+ audio. TV client usually provides high-quality Opus or AAC.
        '--format', 'bestaudio[ext=m4a][abr>=128]/bestaudio[ext=m4a]/bestaudio/best',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--no-part',
        '--no-cache-dir',
        '--force-ipv4',
        // TV and TVEmbed are the most reliable for bypassing blocks. 
        // We put them first, but keep android/web as fallbacks.
        '--extractor-args', 'youtube:player-client=tv,tvembed,android,web',
        '--geo-bypass',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

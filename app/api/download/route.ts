import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Serenity Download API (Binary + JS Runtime + TV Bypass)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle } = body;

        if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

        const tmpDir = path.join(os.tmpdir(), 'serenity-audio-v3');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);

        const cwd = process.cwd();
        const libPath = path.join(cwd, 'lib');
        const binaryPath = path.join(libPath, 'yt-dlp');
        const denoPath = path.join(libPath, 'deno');
        const sourceCookiesPath = path.join(libPath, 'cookies.txt');
        const targetCookiesPath = '/tmp/cookies_download.txt';

        const hasBinary = fs.existsSync(binaryPath) && process.platform !== 'win32';
        const hasSourceCookies = fs.existsSync(sourceCookiesPath);

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

        const args = [
            ...baseArgs,
            ...(hasSourceCookies ? ['--cookies', process.env.VERCEL === '1' ? targetCookiesPath : sourceCookiesPath] : []),
            '-f', 'bestaudio[abr>=160]/bestaudio[ext=m4a][abr>=128]/bestaudio/best',
            '--no-playlist',
            '--no-check-certificates',
            '--no-part',
            '--no-cache-dir',
            '--force-ipv4',
            // TV fails with DRM, iOS fails with PO token. We use web_creator which has no PO token JS checks.
            '--extractor-args', 'youtube:player-client=web_creator,default',
            '--geo-bypass',
            '--output', outputTemplate,
            `https://www.youtube.com/watch?v=${videoId}`
        ];

        return new Promise<Response>((resolve) => {
            const ytDlp = spawn(spawnCmd, args, { env });
            let stderr = '';

            ytDlp.stderr.on('data', (data: any) => {
                stderr += data.toString();
            });

            ytDlp.on('close', async (code: number) => {
                if (code !== 0) {
                    console.error(`[download] failed: ${stderr}`);
                    return resolve(NextResponse.json({ error: `yt-dlp failed: ${stderr}` }, { status: 500 }));
                }

                try {
                    const files = fs.readdirSync(tmpDir);
                    const downloadedFile = files.find(f => f.startsWith(videoId + '.'));

                    if (!downloadedFile) {
                        return resolve(NextResponse.json({ error: 'File not found after download' }, { status: 500 }));
                    }

                    const finalPath = path.join(tmpDir, downloadedFile);
                    const buf = fs.readFileSync(finalPath);
                    fs.unlinkSync(finalPath);

                    resolve(new Response(new Uint8Array(buf), {
                        headers: {
                            'Content-Type': 'audio/mp4',
                            'X-Track-Id': videoId,
                            'X-Track-Title': encodeURIComponent(title || ''),
                            'X-Track-Artist': encodeURIComponent(channelTitle || ''),
                        },
                    }));
                } catch (e: any) {
                    resolve(NextResponse.json({ error: `Read error: ${e.message}` }, { status: 500 }));
                }
            });

            ytDlp.on('error', (err: any) => {
                resolve(NextResponse.json({ error: `Spawn error: ${err.message}` }, { status: 500 }));
            });
        });

    } catch (error: any) {
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Serenity Download API (Binary Version - Read-Only Fix)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle } = body;

        if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

        const tmpDir = path.join(os.tmpdir(), 'serenity-audio');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);

        const binaryPath = path.join(process.cwd(), 'lib/yt-dlp');
        const sourceCookiesPath = path.join(process.cwd(), 'lib/cookies.txt');
        const targetCookiesPath = '/tmp/cookies_download.txt';
        const hasBinary = fs.existsSync(binaryPath);
        const hasSourceCookies = fs.existsSync(sourceCookiesPath);

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

        // Vercel fix: Copy cookies to /tmp since yt-dlp tries to update them (ReadOnly FS error)
        let activeCookiesPath = null;
        if (hasSourceCookies) {
            try {
                const cookieContent = fs.readFileSync(sourceCookiesPath, 'utf8');
                fs.writeFileSync(targetCookiesPath, cookieContent);
                activeCookiesPath = targetCookiesPath;
            } catch (e: any) {
                console.error(`[download] Cookie copy failed: ${e.message}`);
            }
        }

        const args = [
            ...baseArgs,
            '-f', 'ba[ext=m4a]/ba',
            '--no-playlist',
            '--no-check-certificates',
            '--no-part',
            '--no-cache-dir',
            '--force-ipv4',
            '--extractor-args', 'youtube:player-client=web,android,mweb',
            '--geo-bypass',
            '--output', outputTemplate,
            `https://www.youtube.com/watch?v=${videoId}`
        ];

        if (activeCookiesPath) {
            args.push('--cookies', activeCookiesPath);
        }

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

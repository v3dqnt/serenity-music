import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Serenity Download API (Python Reversion)
 * ----------------------------------------
 * Reverted to yt-dlp via Python as requested.
 * Optimized for Vercel compatibility by using a bundled binary.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle } = body;

        if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

        const tmpDir = path.join(os.tmpdir(), 'serenity-audio');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);

        // Binary discovery
        const localBinPaths = [
            path.join(process.cwd(), 'lib/bin/yt-dlp'),
            path.join(process.cwd(), 'bin/yt-dlp'),
        ];

        let ytDlpPath = '';
        for (const p of localBinPaths) {
            if (fs.existsSync(p)) {
                ytDlpPath = p;
                break;
            }
        }

        const isBinary = ytDlpPath !== '';
        const spawnCmd = isBinary ? ytDlpPath : (process.platform === 'win32' ? 'python' : 'python3');
        const baseArgs = isBinary ? [] : ['-m', 'yt_dlp'];

        console.log(`[download] Attempting to spawn: ${spawnCmd} for ${videoId}`);

        if (isBinary && process.platform !== 'win32') {
            try {
                fs.chmodSync(ytDlpPath, '755');
            } catch (e) {
                console.warn(`[download] Could not chmod 755 ${ytDlpPath}:`, e);
            }
        }

        const args = [
            ...baseArgs,
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '--no-playlist',
            '--output', outputTemplate,
            `https://www.youtube.com/watch?v=${videoId}`
        ];

        return new Promise<Response>((resolve) => {
            let ytDlp: any;
            try {
                ytDlp = spawn(spawnCmd, args);
            } catch (e: any) {
                console.error(`[download] Spawn failed ${spawnCmd}:`, e);
                return resolve(NextResponse.json({ error: `Spawn failed: ${e.message}` }, { status: 500 }));
            }

            ytDlp.on('close', async (code: number) => {
                if (code !== 0) {
                    console.error(`[download] yt-dlp exited with code ${code}`);
                    return resolve(NextResponse.json({ error: 'Download failed' }, { status: 500 }));
                }

                const files = fs.readdirSync(tmpDir);
                const downloadedFile = files.find(f => f.startsWith(videoId + '.'));

                if (!downloadedFile) {
                    return resolve(NextResponse.json({ error: 'File not found after download' }, { status: 500 }));
                }

                const finalPath = path.join(tmpDir, downloadedFile);
                const buf = fs.readFileSync(finalPath);

                // Cleanup
                fs.unlinkSync(finalPath);

                resolve(new Response(new Uint8Array(buf), {
                    headers: {
                        'Content-Type': 'audio/mp4',
                        'X-Track-Id': videoId,
                        'X-Track-Title': encodeURIComponent(title || ''),
                        'X-Track-Artist': encodeURIComponent(channelTitle || ''),
                    },
                }));
            });

            ytDlp.on('error', (err: any) => {
                console.error(`[download] Process error:`, err);
                resolve(NextResponse.json({ error: `Process error: ${err.message}` }, { status: 500 }));
            });
        });

    } catch (error: any) {
        console.error('[download] Error:', error);
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}

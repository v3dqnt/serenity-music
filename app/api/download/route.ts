import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Serenity Download API (Python Reversion)
 * ----------------------------------------
 * Reverted to yt-dlp via Python as requested.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle } = body;

        if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

        const tmpDir = path.join(os.tmpdir(), 'serenity-audio');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        console.log(`[download] Fetching ${videoId} using ${pythonCmd}`);

        const args = [
            '-m', 'yt_dlp',
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '--no-playlist',
            '--output', outputTemplate,
            `https://www.youtube.com/watch?v=${videoId}`
        ];

        return new Promise((resolve) => {
            const ytDlp = spawn(pythonCmd, args);

            ytDlp.on('close', async (code) => {
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

            ytDlp.on('error', (err) => {
                console.error(`[download] Spawn error:`, err);
                resolve(NextResponse.json({ error: `Spawn error: ${err.message}` }, { status: 500 }));
            });
        });

    } catch (error: any) {
        console.error('[download] Error:', error);
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}

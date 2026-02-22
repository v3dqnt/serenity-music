import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Serenity Download API (Python Reversion V4)
 * -------------------------------------------
 * Uses yt-dlp via PYTHONPATH for maximum reliability on Vercel.
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
        const cwd = process.cwd();

        // Match the same potential paths as the streaming route
        const potentialPaths = [
            path.join(cwd, 'lib/python'),
            path.join(cwd, '.next/server/lib/python'),
            path.join(cwd, '..', 'lib/python'),
            '/var/task/lib/python'
        ];

        let pythonLibPath = potentialPaths[0];
        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                pythonLibPath = p;
                break;
            }
        }

        const env = {
            ...process.env,
            PYTHONPATH: `${pythonLibPath}${path.delimiter}${process.env.PYTHONPATH || ''}`,
            PYTHONUNBUFFERED: '1'
        };

        console.log(`[download] Spawning ${pythonCmd} -m yt_dlp for ${videoId}`);

        const args = [
            '-m', 'yt_dlp',
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '--no-playlist',
            '--no-warnings',
            '--no-part',               // Crucial for direct processing
            '--no-check-certificates',
            '--output', outputTemplate,
            `https://www.youtube.com/watch?v=${videoId}`
        ];

        return new Promise<Response>((resolve) => {
            let ytDlp: any;
            try {
                ytDlp = spawn(pythonCmd, args, { env });
            } catch (e: any) {
                console.error(`[download] Spawn failure:`, e);
                return resolve(NextResponse.json({ error: `Spawn failed: ${e.message}` }, { status: 500 }));
            }

            ytDlp.stderr.on('data', (data: any) => {
                console.error(`[download] yt-dlp stderr: ${data.toString()}`);
            });

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

                console.log(`[download] Successfully read ${buf.length} bytes for ${videoId}`);

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

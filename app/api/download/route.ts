import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Serenity Download API (Python Reversion V5)
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle } = body;

        if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

        // Use /tmp which is writable on Vercel
        const tmpDir = path.join(os.tmpdir(), 'serenity-audio');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const cwd = process.cwd();

        const potentialPaths = [
            path.join(cwd, 'lib/python'),
            path.join(cwd, '.next/server/lib/python'),
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

        const args = [
            '-m', 'yt_dlp',
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '--no-playlist',
            '--no-check-certificates',
            '--no-part', // Important for RO environments
            '--output', outputTemplate,
            `https://www.youtube.com/watch?v=${videoId}`
        ];

        return new Promise<Response>((resolve) => {
            let stderr = '';
            const ytDlp = spawn(pythonCmd, args, { env });

            ytDlp.stderr.on('data', (data: any) => {
                stderr += data.toString();
            });

            ytDlp.on('close', async (code: number) => {
                if (code !== 0) {
                    console.error(`[download] yt-dlp failed (code ${code}): ${stderr}`);
                    return resolve(NextResponse.json({ error: `yt-dlp failed (code ${code}): ${stderr}` }, { status: 500 }));
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

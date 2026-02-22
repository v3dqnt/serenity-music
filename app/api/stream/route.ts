import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Serenity Streaming API
 * ----------------------
 * Uses the same logic as local development but updated for Vercel.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Determine the python command based on the environment
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    // Set up the environment to find our locally installed yt-dlp
    // We use process.cwd() as the base
    const pythonLibPath = path.resolve(process.cwd(), 'lib/python');

    const env = {
        ...process.env,
        PYTHONPATH: pythonLibPath,
        PYTHONUNBUFFERED: '1'
    };

    console.log(`[stream] Spawning ${pythonCmd} -m yt_dlp for ${videoId}`);

    // Same arguments as used locally
    const args = [
        '-m', 'yt_dlp',
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    const ytDlp = spawn(pythonCmd, args, { env });

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk: any) => {
                controller.enqueue(chunk);
            });

            ytDlp.stderr.on('data', (data: any) => {
                const msg = data.toString();
                if (msg.includes('ERROR')) {
                    console.error(`[stream] yt-dlp error: ${msg}`);
                }
            });

            ytDlp.on('close', (code: number) => {
                if (code !== 0) {
                    console.error(`[stream] yt-dlp exited with code ${code}`);
                }
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                console.error(`[stream] spawn error: ${err}`);
                controller.error(err);
            });
        },
        cancel() {
            ytDlp.kill();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mp4',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
        },
    });
}

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Serenity Streaming API (Python Reversion V3)
 * -------------------------------------------
 * Uses yt-dlp via PYTHONPATH for maximum reliability on Vercel.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    // On Vercel, we need to ensure the path is absolute and points to our bundled lib
    const rootPath = process.env.PWD || process.cwd();
    const pythonLibPath = path.join(rootPath, 'lib/python');

    const env = {
        ...process.env,
        PYTHONPATH: `${pythonLibPath}${path.delimiter}${process.env.PYTHONPATH || ''}`,
        PYTHONUNBUFFERED: '1'
    };

    console.log(`[stream] Spawning ${pythonCmd} -m yt_dlp for ${videoId}`);
    console.log(`[stream] PYTHONPATH: ${env.PYTHONPATH}`);

    const args = [
        '-m', 'yt_dlp',
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates', // Helps in some restricted environments
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(pythonCmd, args, { env });
    } catch (e: any) {
        console.error(`[stream] Failed to spawn ${pythonCmd}:`, e);
        return NextResponse.json({ error: `Spawn failed: ${e.message}` }, { status: 500 });
    }

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk: any) => controller.enqueue(chunk));

            ytDlp.stderr.on('data', (data: any) => {
                const msg = data.toString();
                if (msg.includes('ERROR')) console.error(`[stream] yt-dlp error: ${msg}`);
            });

            ytDlp.on('close', (code: number) => {
                console.log(`[stream] yt-dlp closed with code ${code}`);
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                console.error(`[stream] Process error:`, err);
                controller.error(err);
            });
        },
        cancel() {
            try { ytDlp.kill(); } catch { }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mp4',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
            'X-Stream-Status': 'active'
        },
    });
}

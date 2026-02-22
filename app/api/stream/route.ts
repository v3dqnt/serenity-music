import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Python Reversion V5)
 * -------------------------------------------
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    // Attempt to locate lib/python using multiple strategy
    const cwd = process.cwd();
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

    // Use absolute path to python lib if possible
    console.log(`[stream] Using PYTHONPATH: ${env.PYTHONPATH}`);

    const args = [
        '-m', 'yt_dlp',
        '--format', 'bestaudio[ext=m4a]/bestaudio', // Specific format for browser compatibility
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--no-part', // Crucial: don't write part files to RO filesystem
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(pythonCmd, args, { env });
    } catch (e: any) {
        console.error(`[stream] Spawn failure: ${e.message}`);
        return NextResponse.json({ error: `Spawn failed: ${e.message}` }, { status: 500 });
    }

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk: any) => {
                controller.enqueue(chunk);
            });

            ytDlp.stderr.on('data', (data: any) => {
                const msg = data.toString();
                console.error(`[stream] yt-dlp stderr: ${msg}`);
            });

            ytDlp.on('close', (code: number) => {
                console.log(`[stream] yt-dlp exited with code ${code}`);
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                console.error(`[stream] process error: ${err.message}`);
                controller.error(err);
            });
        },
        cancel() {
            try { ytDlp.kill(); } catch { }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mp4', // Back to mp4 as we requested m4a
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
        },
    });
}

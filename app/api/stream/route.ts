import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Python Reversion V5 - Diagnostic)
 * -------------------------------------------
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

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
        '--format', 'bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-part',
        '--no-check-certificates',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(pythonCmd, args, { env });
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
                    console.error(`[stream] yt-dlp failed: ${errorOutput}`);
                    // We can't return JSON now as the stream header is already sent
                }
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                controller.error(err);
            });
        },
        cancel() {
            ytDlp.kill();
        }
    });

    // Content-Type: audio/mpeg is a safe bet for most browsers
    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
        },
    });
}

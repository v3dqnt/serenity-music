import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Serenity Streaming API (Python Reversion V4)
 * -------------------------------------------
 * Uses yt-dlp via PYTHONPATH for maximum reliability on Vercel.
 * Optimized with exact arguments used for local development.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    // Attempt to locate lib/python in multiple places due to Vercel's complex runtime structure
    const cwd = process.cwd();
    const potentialPaths = [
        path.join(cwd, 'lib/python'),
        path.join(cwd, '.next/server/lib/python'), // Sometimes files end up here with outputFileTracing
        path.join(cwd, '..', 'lib/python'),
        '/var/task/lib/python'
    ];

    let pythonLibPath = potentialPaths[0];
    for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
            pythonLibPath = p;
            console.log(`[stream] Found lib/python at: ${p}`);
            break;
        }
    }

    const env = {
        ...process.env,
        PYTHONPATH: `${pythonLibPath}${path.delimiter}${process.env.PYTHONPATH || ''}`,
        PYTHONUNBUFFERED: '1',
        // Next.js/Vercel specific traces
        LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT || cwd
    };

    console.log(`[stream] Spawning ${pythonCmd} -m yt_dlp for ${videoId}`);

    const args = [
        '-m', 'yt_dlp',
        '--format', 'bestaudio[ext=m4a]/bestaudio', // Exact local logic
        '--output', '-',                           // Stream to stdout
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        '--no-part',                               // Disable .part files (crucial for streaming)
        '--no-check-certificates',                 // Bypass SSL issues in restricted envs
        '--prefer-free-formats',
        '--geo-bypass',                            // Help with regional restrictions
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(pythonCmd, args, { env });
    } catch (e: any) {
        console.error(`[stream] Immediate spawn failure:`, e);
        return NextResponse.json({ error: `Spawn failed: ${e.message}` }, { status: 500 });
    }

    const stream = new ReadableStream({
        start(controller) {
            let hasSentData = false;

            ytDlp.stdout.on('data', (chunk: any) => {
                if (!hasSentData) {
                    console.log(`[stream] First chunk received for ${videoId} (${chunk.length} bytes)`);
                    hasSentData = true;
                }
                controller.enqueue(chunk);
            });

            ytDlp.stderr.on('data', (data: any) => {
                const msg = data.toString();
                // Log all errors to help debug the "0:00" issue
                console.error(`[stream] yt-dlp stderr: ${msg}`);
            });

            ytDlp.on('close', (code: number) => {
                console.log(`[stream] yt-dlp closed with code ${code}`);
                if (!hasSentData && code !== 0) {
                    console.error(`[stream] yt-dlp failed to provide any data for ${videoId}`);
                }
                controller.close();
            });

            ytDlp.on('error', (err: any) => {
                console.error(`[stream] Runtime process error:`, err);
                controller.error(err);
            });
        },
        cancel() {
            try {
                ytDlp.kill('SIGKILL'); // Force kill to prevent zombie processes
            } catch (e) {
                console.error(`[stream] Kill failed:`, e);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'audio/mp4',
            'Cache-Control': 'no-cache',
            'Transfer-Encoding': 'chunked',
            'Content-Disposition': 'inline',
        },
    });
}

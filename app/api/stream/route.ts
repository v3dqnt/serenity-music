import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Serenity Streaming API (Python Reversion V2)
 * ---------------------------------------
 * Uses yt-dlp installed in a local python directory for Vercel compatibility.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const pythonLibPath = path.join(process.cwd(), 'lib/python');
    const spawnCmd = process.platform === 'win32' ? 'python' : 'python3';

    // Set PYTHONPATH so python can find the locally installed yt-dlp
    const env = {
        ...process.env,
        PYTHONPATH: pythonLibPath,
        // Ensure stdout/stderr are not buffered so we get data immediately
        PYTHONUNBUFFERED: '1'
    };

    console.log(`[stream] Spawning ${spawnCmd} with PYTHONPATH=${pythonLibPath} for ${videoId}`);

    const args = [
        '-m', 'yt_dlp',
        '--format', 'bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-playlist',
        '--no-warnings',
        `https://www.youtube.com/watch?v=${videoId}`
    ];

    let ytDlp: any;
    try {
        ytDlp = spawn(spawnCmd, args, { env });
    } catch (e: any) {
        console.error(`[stream] Failed to spawn:`, e);
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
                if (code !== 0) console.error(`[stream] yt-dlp exited with code ${code}`);
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
        },
    });
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Use OS temp dir — works locally and on Vercel (/tmp is the only writable dir)
const tmpDir = path.join(os.tmpdir(), 'serenity-audio');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

/** Stream a file as an audio response, then delete it from disk */
function streamAndDelete(filePath: string, videoId: string, meta: Record<string, string>): Response {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.mp3' ? 'audio/mpeg'
        : ext === '.opus' || ext === '.webm' ? 'audio/webm'
            : 'audio/mp4';

    let buf: Buffer;
    try {
        buf = fs.readFileSync(filePath);
    } finally {
        // Always clean up — audio lives in browser IndexedDB, not on disk
        try { fs.unlinkSync(filePath); } catch { /* already gone */ }
        // Also clean up any other temp files for this videoId
        try {
            const files = fs.readdirSync(tmpDir);
            files.filter(f => f.startsWith(videoId + '.')).forEach(f => {
                try { fs.unlinkSync(path.join(tmpDir, f)); } catch { /* ignore */ }
            });
        } catch { /* ignore */ }
    }

    return new Response(new Uint8Array(buf!), {
        status: 200,
        headers: {
            'Content-Type': mimeType,
            'Content-Length': buf!.length.toString(),
            'X-Track-Id': videoId,
            'X-Track-Mime': mimeType,
            'X-Track-Title': encodeURIComponent(meta.title || ''),
            'X-Track-Artist': encodeURIComponent(meta.channelTitle || ''),
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoId, title, channelTitle, thumbnail } = body;

        if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });

        const meta = {
            title: title || `Track ${videoId}`,
            channelTitle: channelTitle || 'Unknown Artist',
            thumbnail: thumbnail || '',
            addedAt: new Date().toISOString(),
        };

        // ── Download to temp dir ─────────────────────────────────────────────
        console.log(`[download] Fetching: ${videoId}`);
        const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);
        const dlCmd = [
            'python -m yt_dlp',
            '-f "bestaudio[ext=m4a]/bestaudio"',
            '--concurrent-fragments 5',
            '--buffer-size 64K',
            '--no-part',
            '--no-check-certificates',
            `--output "${outputTemplate}"`,
            `"https://www.youtube.com/watch?v=${videoId}"`,
        ].join(' ');

        await execPromise(dlCmd, { timeout: 120_000 });

        const files = fs.readdirSync(tmpDir);
        const downloadedFile = files.find(f => f.startsWith(videoId + '.'));
        if (!downloadedFile) throw new Error('Download produced no file');

        const finalPath = path.join(tmpDir, downloadedFile);
        console.log(`[download] Downloaded: ${downloadedFile}`);

        // ── Stream to browser then delete ────────────────────────────────────
        // Browser will store in IndexedDB — no permanent disk copy kept
        console.log(`[download] Streaming & deleting: ${path.basename(finalPath)}`);
        return streamAndDelete(finalPath, videoId, meta);

    } catch (error: any) {
        console.error('[download] Error:', error);
        // Clean up any temp files on error
        try {
            const { videoId } = await request.json().catch(() => ({ videoId: '' }));
            if (videoId) {
                fs.readdirSync(tmpDir)
                    .filter(f => f.startsWith(videoId + '.'))
                    .forEach(f => { try { fs.unlinkSync(path.join(tmpDir, f)); } catch { /* ignore */ } });
            }
        } catch { /* ignore */ }
        return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
    }
}

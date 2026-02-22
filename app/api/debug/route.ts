import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET() {
    const cwd = process.cwd();
    const debugInfo: any = {
        cwd: cwd,
        rootContents: fs.readdirSync(cwd),
        libExists: fs.existsSync(path.join(cwd, 'lib')),
        libContents: fs.existsSync(path.join(cwd, 'lib')) ? fs.readdirSync(path.join(cwd, 'lib')) : [],
        tmpContents: fs.readdirSync('/tmp').slice(0, 10),
    };

    const binaryPath = path.join(cwd, 'lib/yt-dlp');
    if (fs.existsSync(binaryPath)) {
        const stats = fs.statSync(binaryPath);
        debugInfo.binaryStats = {
            size: stats.size,
            mode: stats.mode.toString(8),
            uid: stats.uid,
            gid: stats.gid
        };

        try {
            // Try running the binary version
            debugInfo.binaryVersion = execSync(`${binaryPath} --version`).toString().trim();
        } catch (e: any) {
            debugInfo.binaryRunError = e.message;
        }
    } else {
        debugInfo.binaryMissing = true;
    }

    return NextResponse.json(debugInfo);
}

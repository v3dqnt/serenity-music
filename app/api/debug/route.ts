import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET() {
    const cwd = process.cwd();
    const libPath = path.join(cwd, 'lib');
    const debugInfo: any = {
        cwd: cwd,
        rootContents: fs.readdirSync(cwd),
        libExists: fs.existsSync(libPath),
        libContents: fs.existsSync(libPath) ? fs.readdirSync(libPath) : [],
        cookiesFound: fs.existsSync(path.join(libPath, 'cookies.txt')),
        tmpContents: fs.readdirSync('/tmp').slice(0, 10),
    };

    const binaryPath = path.join(libPath, 'yt-dlp');
    const denoPath = path.join(libPath, 'deno');

    if (fs.existsSync(binaryPath)) {
        const stats = fs.statSync(binaryPath);
        debugInfo.ytDlpStats = { size: stats.size, mode: stats.mode.toString(8) };
        try {
            debugInfo.ytDlpVersion = execSync(`${binaryPath} --version`).toString().trim();
        } catch (e: any) {
            debugInfo.ytDlpError = e.message;
        }
    }

    if (fs.existsSync(denoPath)) {
        const stats = fs.statSync(denoPath);
        debugInfo.denoStats = { size: stats.size, mode: stats.mode.toString(8) };
        try {
            debugInfo.denoVersion = execSync(`${denoPath} --version`).toString().trim().split('\n')[0];
        } catch (e: any) {
            debugInfo.denoError = e.message;
        }
    }

    return NextResponse.json(debugInfo);
}

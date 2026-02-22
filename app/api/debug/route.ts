import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET() {
    const debugInfo: any = {
        cwd: process.cwd(),
        platform: process.platform,
        env: {
            PATH: process.env.PATH,
            PYTHONPATH: process.env.PYTHONPATH,
            PWD: process.env.PWD,
        },
        libPythonExists: fs.existsSync(path.join(process.cwd(), 'lib/python')),
        libPythonContents: fs.existsSync(path.join(process.cwd(), 'lib/python'))
            ? fs.readdirSync(path.join(process.cwd(), 'lib/python')).slice(0, 10)
            : [],
    };

    try {
        debugInfo.pythonVersion = execSync('python3 --version').toString().trim();
    } catch (e: any) {
        debugInfo.pythonError = e.message;
    }

    try {
        debugInfo.pipList = execSync('python3 -m pip list').toString().trim().split('\n').slice(0, 20);
    } catch (e: any) {
        debugInfo.pipError = e.message;
    }

    return NextResponse.json(debugInfo);
}

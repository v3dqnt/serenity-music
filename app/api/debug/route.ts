import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET() {
    const cwd = process.cwd();
    const debugInfo: any = {
        cwd: cwd,
        platform: process.platform,
        env: {
            PATH: process.env.PATH,
            PYTHONPATH: process.env.PYTHONPATH,
            PWD: process.env.PWD,
        },
        libPythonExists: fs.existsSync(path.join(cwd, 'lib/python')),
        libPythonContents: fs.existsSync(path.join(cwd, 'lib/python'))
            ? fs.readdirSync(path.join(cwd, 'lib/python'))
            : [],
        binExists: fs.existsSync(path.join(cwd, 'bin')),
        binContents: fs.existsSync(path.join(cwd, 'bin'))
            ? fs.readdirSync(path.join(cwd, 'bin'))
            : [],
    };

    const commands = ['python3 --version', 'python --version', 'which python3', 'which python', 'ls -la /usr/bin/python*'];
    debugInfo.commandResults = {};

    for (const cmd of commands) {
        try {
            debugInfo.commandResults[cmd] = execSync(cmd, { stdio: 'pipe' }).toString().trim();
        } catch (e: any) {
            debugInfo.commandResults[cmd] = `Error: ${e.message}`;
        }
    }

    return NextResponse.json(debugInfo);
}

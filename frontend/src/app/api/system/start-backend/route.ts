import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

let backendProcess: ReturnType<typeof spawn> | null = null;

export async function POST() {
  try {
    // Prevent starting multiple instances if we already spawned one
    if (backendProcess) {
      return NextResponse.json({ status: 'already_starting' });
    }

    const backendDir = path.resolve(process.cwd(), '../backend');
    
    // Spawn the uvicorn process
    backendProcess = spawn('.venv/bin/uvicorn', ['main:app', '--port', '8000'], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore' // We don't want to pipe stdout/stderr to next.js to prevent hangs
    });

    // Unref so the child can run independently of the next.js process
    backendProcess.unref();

    return NextResponse.json({ status: 'starting', message: 'Backend startup initiated' });
  } catch (error) {
    backendProcess = null;
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

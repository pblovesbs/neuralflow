import { NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST() {
  try {
    // Determine the command to run the backend.
    // The frontend is in the 'frontend' directory, so we cd ../backend
    // We use nohup and direct output to backend.log so the child process detaches
    // properly and doesn't block the API route.
    const command = 'cd ../backend && source .venv/bin/activate && nohup uvicorn main:app --reload > backend.log 2>&1 &';
    
    exec(command, (error) => {
      if (error) {
        console.error('Failed to start backend:', error);
      }
    });

    return NextResponse.json({ success: true, message: 'Backend startup sequence initiated.' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

/**
 * Library is now managed entirely in the browser via IndexedDB (audioCache.ts).
 * This endpoint is kept as a no-op stub so existing import paths don't break.
 * Returns an empty array — callers should use getLibrary() from audioCache instead.
 */
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json([]);
}

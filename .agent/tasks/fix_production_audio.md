# Bug Fix: Production Audio Playback & Build Errors

The project is currently experiencing two main issues:
1. **Next.js Build Failure**: A conflict between `middleware.ts` and the new `proxy.ts` convention in Next.js 16.
2. **Audio Playback Failure in Production**: The `yt-dlp` Python process is not available in the Vercel serverless runtime environment, even though it was installed during the build step.

## Proposed Changes

### 1. Resolve Middleware Conflict
- The previous push already removed `middleware.ts` in favor of `proxy.ts`. We will verify if this resolves the build error once the deployment completes.

### 2. Implementation of yt-dlp for Serverless Runtime
- Since global `pip` installs do not persist into the Vercel runtime, we will download the standalone `yt-dlp` binary into a project-local `bin` directory during the build process.
- We will update the API routes to call this local binary directly using its absolute path.
- This ensures that the Python process works as requested by the user, even in a restricted serverless environment.

### 3. Build Script Optimization
- Update `package.json` to handle the binary download and permissions.

## Execution Plan
1. Update `package.json` to download the `yt-dlp` binary during the build step.
2. Update `/api/stream/route.ts` and `/api/download/route.ts` to use the local binary path.
3. Verify that `proxy.ts` is functioning correctly as the replacement for middleware.

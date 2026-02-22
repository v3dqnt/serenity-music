/**
 * AudioCache — IndexedDB-backed temporary audio + library storage
 *
 * Two stores:
 *   'tracks'  — audio blobs, TTL 48h, max 20 entries
 *   'library' — track metadata (no blobs), persisted indefinitely
 *
 * Audio files are never saved to disk or uploaded anywhere.
 * Everything lives in the browser only.
 */

const DB_NAME = 'serenity-audio-cache'
const STORE_AUDIO = 'tracks'
const STORE_LIBRARY = 'library'
const DB_VERSION = 2          // bumped because we added STORE_LIBRARY
const MAX_TRACKS = 20
const MAX_AGE_MS = 48 * 60 * 60 * 1000 // 48 hours

export interface LibraryEntry {
    id: string
    title: string
    channelTitle: string
    thumbnail: string
    addedAt: string
    enhanced: boolean
}

interface CachedTrack {
    id: string
    blob: Blob
    mimeType: string
    cachedAt: number
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_AUDIO)) {
                const s = db.createObjectStore(STORE_AUDIO, { keyPath: 'id' })
                s.createIndex('cachedAt', 'cachedAt')
            }
            if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
                const s = db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' })
                s.createIndex('addedAt', 'addedAt')
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

// ─── Audio blob cache ────────────────────────────────────────────────────────

/** Get a blob: URL for a cached audio track (or null if not cached / expired) */
export async function getCachedBlobUrl(id: string): Promise<string | null> {
    try {
        const db = await openDB()
        return new Promise((resolve) => {
            const req = db.transaction(STORE_AUDIO, 'readonly').objectStore(STORE_AUDIO).get(id)
            req.onsuccess = () => {
                const entry: CachedTrack | undefined = req.result
                if (!entry) return resolve(null)
                if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
                    db.transaction(STORE_AUDIO, 'readwrite').objectStore(STORE_AUDIO).delete(id)
                    return resolve(null)
                }
                resolve(URL.createObjectURL(entry.blob))
            }
            req.onerror = () => resolve(null)
        })
    } catch {
        return null
    }
}

/** Store an audio blob in IndexedDB and evict old entries */
export async function cacheAudioBlob(id: string, blob: Blob, mimeType: string): Promise<void> {
    try {
        const db = await openDB()
        const entry: CachedTrack = { id, blob, mimeType, cachedAt: Date.now() }
        await new Promise<void>((resolve, reject) => {
            const req = db.transaction(STORE_AUDIO, 'readwrite').objectStore(STORE_AUDIO).put(entry)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
        })
        await evictOldTracks(db)
    } catch (e) {
        console.warn('[AudioCache] Failed to cache track:', e)
    }
}

async function evictOldTracks(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
        const store = db.transaction(STORE_AUDIO, 'readwrite').objectStore(STORE_AUDIO)
        const req = store.index('cachedAt').getAll()
        req.onsuccess = () => {
            const all: CachedTrack[] = req.result
            const now = Date.now()
            const valid = all.filter(t => now - t.cachedAt <= MAX_AGE_MS)
            all.filter(t => now - t.cachedAt > MAX_AGE_MS)
                .forEach(t => db.transaction(STORE_AUDIO, 'readwrite').objectStore(STORE_AUDIO).delete(t.id))
            if (valid.length > MAX_TRACKS) {
                [...valid].sort((a, b) => a.cachedAt - b.cachedAt)
                    .slice(0, valid.length - MAX_TRACKS)
                    .forEach(t => db.transaction(STORE_AUDIO, 'readwrite').objectStore(STORE_AUDIO).delete(t.id))
            }
            resolve()
        }
        req.onerror = () => resolve()
    })
}

// ─── Library metadata ────────────────────────────────────────────────────────

/** Get all library entries, sorted newest-first */
export async function getLibrary(): Promise<LibraryEntry[]> {
    try {
        const db = await openDB()
        return new Promise((resolve) => {
            const req = db.transaction(STORE_LIBRARY, 'readonly').objectStore(STORE_LIBRARY).getAll()
            req.onsuccess = () => {
                const all: LibraryEntry[] = req.result || []
                resolve(all.sort((a, b) =>
                    new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
                ))
            }
            req.onerror = () => resolve([])
        })
    } catch {
        return []
    }
}

/** Upsert a track's metadata in the library */
export async function saveToLibrary(entry: LibraryEntry): Promise<void> {
    try {
        const db = await openDB()
        await new Promise<void>((resolve, reject) => {
            const req = db.transaction(STORE_LIBRARY, 'readwrite').objectStore(STORE_LIBRARY).put(entry)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
        })
    } catch (e) {
        console.warn('[AudioCache] Failed to save library entry:', e)
    }
}

/** Remove a track from the library */
export async function removeFromLibrary(id: string): Promise<void> {
    try {
        const db = await openDB()
        await new Promise<void>((resolve, reject) => {
            const req = db.transaction(STORE_LIBRARY, 'readwrite').objectStore(STORE_LIBRARY).delete(id)
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
        })
    } catch (e) {
        console.warn('[AudioCache] Failed to remove library entry:', e)
    }
}

/** Clear all cached audio blobs (library metadata is kept) */
export async function clearAudioCache(): Promise<void> {
    try {
        const db = await openDB()
        await new Promise<void>((resolve, reject) => {
            const req = db.transaction(STORE_AUDIO, 'readwrite').objectStore(STORE_AUDIO).clear()
            req.onsuccess = () => resolve()
            req.onerror = () => reject(req.error)
        })
    } catch (e) {
        console.warn('[AudioCache] Failed to clear cache:', e)
    }
}

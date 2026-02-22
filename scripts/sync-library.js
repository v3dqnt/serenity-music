const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const musicDir = path.join(process.cwd(), 'public', 'music');
const dataDir = path.join(process.cwd(), 'data');
const libraryFile = path.join(dataDir, 'library.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

async function syncLibrary() {
    console.log('Syncing library...');

    // 1. Get existing files
    if (!fs.existsSync(musicDir)) {
        console.log('No music directory found.');
        return;
    }

    const files = fs.readdirSync(musicDir);
    const validExtensions = ['.m4a', '.mp3', '.webm'];

    // 2. Get existing library
    let library = [];
    if (fs.existsSync(libraryFile)) {
        try {
            library = JSON.parse(fs.readFileSync(libraryFile, 'utf-8'));
        } catch (e) {
            console.error('Error reading library.json:', e);
            library = [];
        }
    }

    // 3. Process files
    let updated = false;

    for (const file of files) {
        const ext = path.extname(file);
        if (!validExtensions.includes(ext)) continue;

        const videoId = path.basename(file, ext);

        // Check if already in library
        if (library.find(item => item.id === videoId)) {
            continue;
        }

        console.log(`Found orphaned file: ${file} (ID: ${videoId}). Fetching metadata...`);

        try {
            // Fetch metadata using yt-dlp
            // We use --print to get specific fields consistently
            // Format: id|title|uploader|thumbnail
            const command = `python -m yt_dlp --print "%(id)s|%(title)s|%(uploader)s|%(thumbnail)s" --skip-download "https://www.youtube.com/watch?v=${videoId}"`;

            const { stdout } = await execPromise(command);
            const [id, title, channelTitle, thumbnail] = stdout.trim().split('|');

            if (id && title) {
                const newEntry = {
                    id: id,
                    title: title,
                    channelTitle: channelTitle || 'Unknown Artist',
                    thumbnail: thumbnail || '',
                    url: `/music/${file}`,
                    addedAt: new Date().toISOString()
                };

                library.push(newEntry);
                updated = true;
                console.log(`Added: ${title}`);
            }

        } catch (error) {
            console.error(`Failed to fetch metadata for ${videoId}:`, error.message);
            // Optional: Add with fallback info so we don't retry forever?
            // For now, let's skip and try next time.
        }
    }

    // 4. Save
    if (updated) {
        fs.writeFileSync(libraryFile, JSON.stringify(library, null, 2));
        console.log('Library updated successfully.');
    } else {
        console.log('Library is up to date.');
    }
}

syncLibrary();

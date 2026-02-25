import sys
import os
from pytubefix import YouTube

def get_best_audio(video_id):
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    # We use use_po_token=True to automatically solve the PO Token challenges
    yt = YouTube(url, use_po_token=True)
    
    # Get the highest quality audio stream available
    audio_stream = yt.streams.get_audio_only()
    
    if not audio_stream:
        raise Exception("No audio streams found")
        
    return audio_stream

def handle_stream(video_id):
    try:
        stream = get_best_audio(video_id)
        # Simply print the direct URL to stdout so Node can pipe it
        print(stream.url)
    except Exception as e:
        sys.stderr.write(f"Error extracting stream: {str(e)}\n")
        sys.exit(1)

def handle_download(video_id, output_dir):
    try:
        stream = get_best_audio(video_id)
        
        # Download the file to the specified directory with the video_id as filename
        filename = f"{video_id}.{stream.subtype}"
        stream.download(output_path=output_dir, filename=filename)
        
        # Print the final path to stdout
        final_path = os.path.join(output_dir, filename)
        print(final_path)
    except Exception as e:
        sys.stderr.write(f"Error downloading video: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python pytubefix_bridge.py <action> <video_id> [output_dir]\n")
        sys.exit(1)

    action = sys.argv[1]
    video_id = sys.argv[2]

    if action == "stream":
        handle_stream(video_id)
    elif action == "download":
        if len(sys.argv) < 4:
            sys.stderr.write("Error: Output directory required for download action\n")
            sys.exit(1)
        output_dir = sys.argv[3]
        handle_download(video_id, output_dir)
    else:
        sys.stderr.write(f"Unknown action: {action}\n")
        sys.exit(1)

#!/usr/bin/env python3
"""
Re-download Videos from HeyGen
================================

After upgrading your videos to a new motion engine (using heygen_update.py),
HeyGen re-renders the videos in-place using the same video ID. This script
polls each video's status and downloads the newly rendered version, overwriting
the old files in output/videos/.

You only need this script after running heygen_update.py. For normal video
generation, generate_videos.py handles downloading automatically.

Usage:
    python redownload_videos.py                # Re-download all completed videos
    python redownload_videos.py --lesson 1.0   # Re-download one lesson
    python redownload_videos.py --status       # Check which videos are ready
"""

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# API key from .env
HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")

# File paths (relative to this script)
STATE_FILE = Path(__file__).parent / "state.json"
VIDEOS_DIR = Path(__file__).parent / "output" / "videos"

# How many videos to download at the same time
CONCURRENT_DOWNLOADS = 3


def get_video_url(video_id):
    """Check a video's status on HeyGen and return its download URL if ready."""
    url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"
    headers = {"X-Api-Key": HEYGEN_API_KEY, "Accept": "application/json"}
    resp = requests.get(url, headers=headers, timeout=30)
    if resp.status_code != 200:
        return None, f"API error {resp.status_code}"
    data = resp.json().get("data", {})
    status = data.get("status")
    if status == "completed":
        return data.get("video_url"), "completed"
    return None, status


def download_video(video_url, output_file):
    """Download a video file, overwriting any existing version."""
    resp = requests.get(video_url, timeout=300, stream=True)
    if resp.status_code != 200:
        return False
    with open(output_file, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return True


def download_chunk(lesson_id, chunk):
    """Download a single chunk's video. Returns (lesson_id, part, success, message)."""
    part = chunk["part"]
    video_id = chunk.get("heygen_video_id")
    if not video_id:
        return (lesson_id, part, False, "no video ID")

    video_url, status = get_video_url(video_id)
    if not video_url:
        return (lesson_id, part, False, f"status: {status}")

    output_file = VIDEOS_DIR / f"lesson-{lesson_id}-part-{part}.mp4"
    if download_video(video_url, output_file):
        size_mb = output_file.stat().st_size / (1024 * 1024)
        return (lesson_id, part, True, f"{size_mb:.1f} MB")
    return (lesson_id, part, False, "download failed")


def main():
    parser = argparse.ArgumentParser(description="Re-download videos from HeyGen after motion engine upgrade")
    parser.add_argument("--lesson", type=str, help="Re-download only this lesson (e.g., 1.0)")
    parser.add_argument("--status", action="store_true", help="Check status without downloading")
    args = parser.parse_args()

    if not HEYGEN_API_KEY or HEYGEN_API_KEY.startswith("your_"):
        print("[ERROR] Set HEYGEN_API_KEY in your .env file")
        sys.exit(1)

    if not STATE_FILE.exists():
        print("[ERROR] state.json not found. Run generate_videos.py first.")
        sys.exit(1)

    with open(STATE_FILE) as f:
        state = json.load(f)

    # Collect all completed videos (no module filter — works with any lessons)
    chunks_to_download = []
    for lesson_id in sorted(state.get("lessons", {}).keys()):
        if args.lesson and lesson_id != args.lesson:
            continue
        for chunk in state["lessons"][lesson_id].get("chunks", []):
            if chunk.get("video_status") == "completed" and chunk.get("heygen_video_id"):
                chunks_to_download.append((lesson_id, chunk))

    print(f"Found {len(chunks_to_download)} completed videos to process.\n")

    if args.status:
        # Just check status without downloading
        ready = 0
        not_ready = 0
        for lesson_id, chunk in chunks_to_download:
            video_url, status = get_video_url(chunk["heygen_video_id"])
            marker = "OK" if video_url else "  "
            if video_url:
                ready += 1
            else:
                not_ready += 1
            print(f"  [{marker}] Lesson {lesson_id} Part {chunk['part']}: {status}")
        print(f"\n{ready} ready, {not_ready} not ready")
        return

    # Download videos concurrently
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    success = 0
    failed = 0
    skipped = 0

    with ThreadPoolExecutor(max_workers=CONCURRENT_DOWNLOADS) as pool:
        futures = {
            pool.submit(download_chunk, lid, chunk): (lid, chunk["part"])
            for lid, chunk in chunks_to_download
        }
        for future in as_completed(futures):
            lid, part = futures[future]
            try:
                _, _, ok, msg = future.result()
            except Exception as e:
                ok, msg = False, str(e)

            if ok:
                success += 1
                print(f"  [OK] Lesson {lid} Part {part}: {msg}")
            elif "processing" in msg or "pending" in msg:
                skipped += 1
                print(f"  [WAIT] Lesson {lid} Part {part}: {msg} (still rendering)")
            else:
                failed += 1
                print(f"  [FAIL] Lesson {lid} Part {part}: {msg}")

    print(f"\nDone: {success} downloaded, {skipped} still rendering, {failed} failed")
    if skipped > 0:
        print("Re-run this script later to pick up videos that are still rendering.")


if __name__ == "__main__":
    main()

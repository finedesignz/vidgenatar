# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automated course video pipeline that turns lesson scripts into avatar-narrated videos. Three-stage workflow: load scripts (local files or Google Docs) → generate narration via ElevenLabs TTS → create avatar videos via HeyGen API. Single Python file (`generate_videos.py`) handles the full pipeline with resumable state tracking.

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up your API keys

```bash
cp .env.example .env
```

Then edit `.env` and add your real API keys:
- **HeyGen API key** — get it at https://app.heygen.com/settings/api
- **ElevenLabs API key** — get it at https://elevenlabs.io/settings/api-keys

### 3. Configure your avatar and voice

Edit `config.json`:

```json
{
  "avatar": {
    "id": "paste-your-heygen-avatar-id-here",
    "name": "Your Avatar Name"
  },
  "voice": {
    "id": "paste-your-elevenlabs-voice-id-here"
  }
}
```

**How to find your avatar ID:**
1. Go to https://app.heygen.com and navigate to "Avatars"
2. Click on your avatar
3. The avatar ID is in the URL or shown in the avatar details

**How to find your voice ID:**
1. Go to https://elevenlabs.io and navigate to "Voices"
2. Click on the voice you want to use
3. Copy the Voice ID from the settings panel

### 4. Add your lessons

Edit the `lessons` section in `config.json`:

```json
"lessons": {
  "1.0": {
    "title": "My First Lesson",
    "source": "local",
    "file": "scripts/my-lesson.txt"
  }
}
```

For local files, drop your `.txt` scripts in the `scripts/` folder. For Google Docs, use `"source": "google_doc"` with a `"doc_id"`.

### 5. Test with a dry run

```bash
python generate_videos.py --dry-run
```

This exports and splits scripts without making any API calls (no credits used).

### 6. Generate your first video

```bash
python generate_videos.py --lesson 1.0 --max-parts 1
```

Start with one lesson and one chunk to verify everything works before processing your full course.

## Commands

```bash
# Full pipeline (all lessons)
python generate_videos.py

# Export and split scripts only (no API calls)
python generate_videos.py --dry-run

# Process a single module
python generate_videos.py --module 1

# Process a single lesson
python generate_videos.py --lesson 1.0

# Limit chunks per lesson (useful for testing)
python generate_videos.py --max-parts 1

# Show progress summary
python generate_videos.py --status
```

## Architecture

Everything lives in `generate_videos.py`. The pipeline processes lessons through six sequential stages per chunk:

1. **Load Script** — Read from local `.txt` file or export Google Doc via `gws` CLI
2. **Split** — Sentence-boundary splitting into chunks (configurable word limit)
3. **Generate Audio** — ElevenLabs TTS API → MP3 file
4. **Upload to HeyGen** — POST audio to HeyGen's asset API
5. **Create Video** — POST to HeyGen's video generation API with avatar + audio
6. **Poll & Download** — Poll status every 30s until complete, then download MP4

### State Management

`state.json` tracks every step per lesson chunk. The pipeline skips completed steps on re-run, so you can stop and resume at any time. If a step fails, just fix the issue and run again — completed work is preserved.

### Concurrency

Videos are processed in batches (default: 3 at a time) to respect HeyGen's API rate limits. Audio generation and upload happen in parallel within each batch.

## Configuration

All settings live in `config.json`:

| Setting | Location | Purpose |
|---|---|---|
| API keys | `.env` | HeyGen and ElevenLabs authentication |
| Avatar ID/name | `config.json → avatar` | Your HeyGen avatar |
| Voice ID | `config.json → voice` | Your ElevenLabs voice |
| Voice settings | `config.json → voice.settings` | Stability, speed, etc. |
| Chunk size | `config.json → pipeline.max_chunk_words` | Max words per audio chunk |
| Concurrent limit | `config.json → pipeline.concurrent_limit` | Parallel video requests |
| Lessons | `config.json → lessons` | Your course structure |

## Supplementary Scripts

### heygen_update.py

Browser automation (requires Playwright) for upgrading videos when HeyGen releases a new motion engine. Only needed for version upgrades.

```bash
pip install playwright && playwright install chromium
python heygen_update.py generate   # Build progress file from state.json
python heygen_update.py update     # Upgrade all pending videos
python heygen_update.py status     # Check progress
```

### redownload_videos.py

After upgrading videos with `heygen_update.py`, this script downloads the re-rendered versions.

```bash
python redownload_videos.py          # Download all
python redownload_videos.py --status # Check which are ready
```

## Using Claude Code With This Project

Claude Code can help you customize and extend this pipeline. Here are some things you can ask:

- "Add lessons 2.0 through 2.5 to my config"
- "My lesson 1.0 failed at audio generation — help me debug it"
- "Change the chunk size to 150 words"
- "Show me the current pipeline status and explain what's left"
- "Help me set up Google Docs export with the gws CLI"
- "Add a new voice setting for a different ElevenLabs voice"

## Output Structure

```
output/
  scripts/    # Exported and split text files
  audio/      # ElevenLabs MP3 files
  videos/     # Downloaded HeyGen MP4 files
```

## Troubleshooting

**"config.json has placeholder values"** — Edit config.json and replace all `YOUR_*` values with your real IDs.

**"Set HEYGEN_API_KEY in .env"** — Copy `.env.example` to `.env` and add your API keys.

**ElevenLabs API error 401** — Your ElevenLabs API key is invalid or expired. Get a new one from the dashboard.

**HeyGen video failed** — Check the error message. Common causes: avatar not found, audio too long, account out of credits.

**Audio duration warning** — Chunks longer than 65 seconds may cause issues. Lower `max_chunk_words` in config.json.

**gws not found** — The `gws` CLI is needed for Google Docs export. If you're using local script files, you can ignore this.

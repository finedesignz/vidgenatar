"""
HeyGen Avatar Update Automation
================================

When HeyGen releases a new avatar motion engine (e.g., Avatar IV -> Avatar V),
your existing videos don't automatically upgrade. This script automates the
upgrade process by:

  1. Reading your completed video IDs from state.json
  2. Opening each video in the HeyGen editor via Playwright (browser automation)
  3. Changing the Motion Engine dropdown to the latest version
  4. Clicking Generate to re-render with the new engine

This is a supplementary script — you only need it when HeyGen releases a new
motion engine and you want to upgrade existing videos.

Prerequisites:
    pip install playwright
    playwright install chromium

Usage:
    python heygen_update.py generate           # Generate progress file from state.json
    python heygen_update.py explore            # Open editor for first pending part (test)
    python heygen_update.py update             # Update ALL pending parts
    python heygen_update.py update --part 1    # Update a single part (for testing)
    python heygen_update.py status             # Show progress from tracker
"""

import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# File paths (relative to this script)
PROGRESS_FILE = Path(__file__).parent / "avatar_update_progress.json"
STATE_FILE = Path(__file__).parent / "state.json"
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"
BROWSER_DATA_DIR = Path(__file__).parent / ".browser-data"

# HeyGen URLs
HEYGEN_URL = "https://app.heygen.com"
EDITOR_URL = "https://app.heygen.com/create-v4"


def load_config():
    """Load config.json for avatar settings."""
    config_path = Path(__file__).parent / "config.json"
    if not config_path.exists():
        print("[ERROR] config.json not found!")
        sys.exit(1)
    with open(config_path, encoding="utf-8") as f:
        return json.load(f)


def load_progress():
    """Load the update progress tracker."""
    with open(PROGRESS_FILE) as f:
        return json.load(f)


def save_progress(progress):
    """Save the update progress tracker."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def generate_progress_from_state():
    """
    Generate avatar_update_progress.json from state.json.

    Scans all completed videos in state.json and creates a progress
    tracker for upgrading them to the new motion engine.
    """
    if not STATE_FILE.exists():
        print("[ERROR] state.json not found. Run generate_videos.py first.")
        sys.exit(1)

    with open(STATE_FILE) as f:
        state = json.load(f)

    config = load_config()

    # Collect all completed videos (no module filter — works with any lessons)
    parts = {}
    part_counter = 1

    for lesson_id in sorted(state.get("lessons", {}).keys()):
        lesson = state["lessons"][lesson_id]
        for chunk in lesson.get("chunks", []):
            if chunk.get("video_status") == "completed" and chunk.get("heygen_video_id"):
                parts[str(part_counter)] = {
                    "lesson_id": lesson_id,
                    "lesson_part": chunk["part"],
                    "heygen_video_id": chunk["heygen_video_id"],
                    "status": "pending",
                }
                part_counter += 1

    progress = {
        "description": "Avatar motion engine upgrade",
        "total_parts": len(parts),
        "parts": parts,
    }

    save_progress(progress)
    print(f"Generated {PROGRESS_FILE.name} with {len(parts)} completed video parts from state.json")
    for p_num, p_data in parts.items():
        print(f"  Part {p_num}: Lesson {p_data['lesson_id']} Part {p_data['lesson_part']} ({p_data['heygen_video_id'][:16]}...)")
    return progress


def ensure_dirs():
    """Create directories for screenshots and browser data if they don't exist."""
    SCREENSHOTS_DIR.mkdir(exist_ok=True)
    BROWSER_DATA_DIR.mkdir(exist_ok=True)


def wait_for_login(page):
    """
    Wait for the user to complete login in the browser.

    The first time you run this, a browser window will open and you'll
    need to log in to HeyGen manually. After that, the session is saved
    in .browser-data/ so you won't need to log in again.
    """
    print("\n" + "=" * 60)
    print("MANUAL STEP: Please log in to HeyGen in the browser window.")
    print("The script will continue automatically once you're logged in.")
    print("=" * 60 + "\n")
    try:
        page.wait_for_url("**/home**", timeout=300_000)
        print("Login detected! Continuing...")
    except PlaywrightTimeout:
        current = page.url
        if "login" in current or "signin" in current:
            print("Login timed out after 5 minutes.")
            return False
        print(f"Landed on {current} — assuming logged in.")
    return True


def screenshot(page, name):
    """Take a screenshot for debugging."""
    path = SCREENSHOTS_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    print(f"  Screenshot: {path.name}")
    return path


def dismiss_modal(page):
    """Dismiss any popup modal that appears when opening the editor."""
    try:
        close_btn = page.get_by_text("Close", exact=True)
        if close_btn.is_visible(timeout=3000):
            close_btn.click()
            time.sleep(1)
            print("  Dismissed modal.")
            return True
    except Exception:
        pass

    try:
        overlay = page.locator("[data-state='open'].tw-fixed.tw-inset-0")
        if overlay.is_visible(timeout=1000):
            overlay.click(position={"x": 10, "y": 10})
            time.sleep(1)
            print("  Dismissed overlay by clicking backdrop.")
            return True
    except Exception:
        pass

    return False


def open_editor(page, video_id):
    """Navigate to the HeyGen editor for a specific video."""
    url = f"{EDITOR_URL}/{video_id}"
    page.goto(url)
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except PlaywrightTimeout:
        pass
    time.sleep(3)
    dismiss_modal(page)
    time.sleep(1)
    return page.url


def get_current_motion_engine(page):
    """Read which Motion Engine version is currently selected."""
    try:
        me_section = page.locator("text=Motion Engine").first
        container = me_section.locator("..").locator("..")
        text = container.inner_text()
        for line in text.split("\n"):
            line = line.strip()
            if line in ("Avatar III", "Avatar IV", "Avatar V"):
                return line
        for avatar_name in ["Avatar V", "Avatar IV", "Avatar III"]:
            if page.get_by_text(avatar_name, exact=True).count() > 0:
                return avatar_name
        return f"unknown (container text: {text[:100]})"
    except Exception as e:
        return f"unknown ({e})"


def change_motion_engine(page, target="Avatar V"):
    """Change the Motion Engine dropdown to the target version."""
    try:
        # Click the current value to open the dropdown
        for current_label in ["Avatar III", "Avatar IV", "Avatar V"]:
            btn = page.get_by_text(current_label, exact=True)
            if btn.count() > 0:
                if current_label == target:
                    print(f"  Already set to {target} — skipping dropdown change")
                    return True
                btn.first.click()
                time.sleep(2)
                break
        else:
            print("  Could not find current Motion Engine value to click")
            return False

        # Click the target option in the dropdown
        clicked = page.evaluate("""(target) => {
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
                const text = el.textContent?.trim() || '';
                if (text.startsWith(target) && text.length < 100) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && rect.left > 800) {
                        el.click();
                        return true;
                    }
                }
            }
            return false;
        }""", target)

        if not clicked:
            print(f"  Could not find visible '{target}' option in dropdown")
            screenshot(page, "dropdown_no_target")
            return False

        time.sleep(2)
        print(f"  Changed Motion Engine to {target}")
        return True

    except Exception as e:
        print(f"  Failed to change Motion Engine: {e}")
        return False


def click_generate(page):
    """Click the Generate button and handle any confirmation dialog."""
    try:
        gen_btn = page.get_by_role("button", name="Generate")
        if gen_btn.count() == 0:
            gen_btn = page.get_by_text("Generate", exact=True).first
        gen_btn.click()
        time.sleep(3)

        # Handle confirmation dialog if it appears
        try:
            submit_btn = page.get_by_role("button", name="Submit")
            if submit_btn.is_visible(timeout=5000):
                submit_btn.click()
                time.sleep(3)
                print("  Clicked Submit.")
        except Exception:
            try:
                confirm = page.get_by_role("button", name="Confirm")
                if confirm.is_visible(timeout=3000):
                    confirm.click()
                    time.sleep(3)
                    print("  Clicked Confirm.")
            except Exception:
                print("  No confirmation dialog found (may have auto-submitted).")

        print("  Generate submitted!")
        return True

    except Exception as e:
        print(f"  Failed to click Generate: {e}")
        return False


def update_single_part(page, part_num, video_id, progress):
    """Update a single video to the new motion engine."""
    part_data = progress["parts"][str(part_num)]
    lesson_info = f"Lesson {part_data.get('lesson_id', '?')} Part {part_data.get('lesson_part', '?')}"

    print(f"\n{'='*50}")
    print(f"Processing Part {part_num} — {lesson_info} (video: {video_id[:16]}...)")
    print(f"{'='*50}")

    part_data["status"] = "in_progress"
    save_progress(progress)

    try:
        # Open the video editor
        print("  Opening editor...")
        editor_url = open_editor(page, video_id)
        print(f"  Editor URL: {editor_url}")
        screenshot(page, f"part{part_num}_01_editor")

        # Check current motion engine
        current_me = get_current_motion_engine(page)
        print(f"  Current Motion Engine: {current_me}")

        if current_me == "Avatar V":
            print(f"  Already on Avatar V — skipping!")
            part_data["status"] = "submitted"
            part_data["note"] = "already_avatar_v"
            save_progress(progress)
            return True

        # Change to new engine
        print("  Changing Motion Engine...")
        if not change_motion_engine(page):
            raise Exception("Failed to change Motion Engine dropdown")
        screenshot(page, f"part{part_num}_02_changed")

        # Submit for re-rendering
        print("  Clicking Generate...")
        if not click_generate(page):
            raise Exception("Failed to click Generate")
        screenshot(page, f"part{part_num}_03_generated")

        part_data["status"] = "submitted"
        save_progress(progress)
        print(f"  Part {part_num} DONE!")
        return True

    except Exception as e:
        print(f"  ERROR on part {part_num}: {e}")
        screenshot(page, f"part{part_num}_error")
        part_data["status"] = "error"
        part_data["error"] = str(e)
        save_progress(progress)
        return False


def update(page, part_filter=None):
    """Update all (or one) video parts to the new motion engine."""
    progress = load_progress()

    if part_filter:
        parts_to_process = [part_filter]
    else:
        parts_to_process = [
            p for p in sorted(progress["parts"].keys(), key=int)
            if progress["parts"][p]["status"] in ("pending", "error")
        ]

    print(f"\n{'#'*50}")
    print(f"# Updating {len(parts_to_process)} parts to new motion engine")
    print(f"{'#'*50}")

    success = 0
    fail = 0

    for part_num in parts_to_process:
        video_id = progress["parts"][part_num]["heygen_video_id"]
        if not video_id:
            print(f"\n  Part {part_num}: No video ID — skipping")
            continue

        result = update_single_part(page, part_num, video_id, progress)
        if result:
            success += 1
        else:
            fail += 1

        # Small delay between parts to be gentle on HeyGen
        if parts_to_process.index(part_num) < len(parts_to_process) - 1:
            print("  Waiting 3s before next part...")
            time.sleep(3)

    print(f"\n{'#'*50}")
    print(f"# COMPLETE: {success} success, {fail} failed out of {len(parts_to_process)}")
    print(f"{'#'*50}")


def explore(page):
    """Open the editor for the first pending part (useful for testing the UI flow)."""
    print("\n--- Exploration: Opening editor for first pending part ---\n")

    progress = load_progress()
    for p_num in sorted(progress["parts"].keys(), key=int):
        if progress["parts"][p_num]["status"] in ("pending", "error"):
            break
    else:
        print("No pending parts to explore!")
        return

    video_id = progress["parts"][p_num]["heygen_video_id"]

    print(f"Opening editor for part {p_num}, video: {video_id}")
    editor_url = open_editor(page, video_id)
    print(f"  Editor URL: {editor_url}")
    screenshot(page, "explore_01_editor")

    current_me = get_current_motion_engine(page)
    print(f"  Current Motion Engine: {current_me}")

    body_text = page.inner_text("body")
    dump_path = SCREENSHOTS_DIR / "explore_editor_text.txt"
    with open(dump_path, "w", encoding="utf-8") as f:
        f.write(body_text)
    print(f"  Editor text saved: {dump_path}")

    # Try opening the dropdown to see available options
    print("\nTrying to open Motion Engine dropdown...")
    try:
        for label in ["Avatar IV", "Avatar III", "Avatar V"]:
            avatar_btn = page.get_by_text(label, exact=True)
            if avatar_btn.count() > 0:
                avatar_btn.first.click()
                time.sleep(2)
                screenshot(page, "explore_02_dropdown_open")
                body_text = page.inner_text("body")
                dump_path = SCREENSHOTS_DIR / "explore_dropdown_text.txt"
                with open(dump_path, "w", encoding="utf-8") as f:
                    f.write(body_text)
                print(f"  Dropdown text saved: {dump_path}")
                break
        else:
            print("  No Avatar engine text found. Checking Motion Engine section...")
            me_parent = page.locator("text=Motion Engine").first.locator("..").locator("..")
            text = me_parent.inner_text()
            print(f"  Motion Engine section text: {text}")
    except Exception as e:
        print(f"  Error: {e}")
        screenshot(page, "explore_02_error")

    screenshot(page, "explore_final")
    print("\n--- Exploration complete! ---")


def show_status():
    """Show current progress from the tracker."""
    if not PROGRESS_FILE.exists():
        print("No progress file found. Run: python heygen_update.py generate")
        return

    progress = load_progress()
    print(f"\n{progress.get('description', 'Avatar Update')}")
    print(f"Total parts: {progress['total_parts']}\n")

    counts = {"pending": 0, "in_progress": 0, "submitted": 0, "error": 0}
    for part_num in sorted(progress["parts"].keys(), key=int):
        p = progress["parts"][part_num]
        status = p["status"]
        counts[status] = counts.get(status, 0) + 1
        marker = {"pending": "  ", "in_progress": ">>", "submitted": "OK", "error": "XX"}
        lesson_info = f"L{p.get('lesson_id', '?')}P{p.get('lesson_part', '?')}"
        print(f"  [{marker.get(status, '??')}] Part {part_num:>2}: {status:<12} {lesson_info}  (video: {p['heygen_video_id'][:12]}...)")

    print(f"\nSummary: {counts}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    command = sys.argv[1]

    if command == "generate":
        generate_progress_from_state()
        return

    if command == "status":
        show_status()
        return

    ensure_dirs()

    # Launch a real browser (Playwright) — this is needed because HeyGen's
    # editor doesn't have an API for changing motion engines.
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_DATA_DIR),
            headless=False,
            viewport={"width": 1440, "height": 900},
            slow_mo=300,
        )
        page = browser.pages[0] if browser.pages else browser.new_page()

        # Navigate to HeyGen and check if we need to log in
        page.goto(HEYGEN_URL)
        time.sleep(3)
        current_url = page.url
        if "login" in current_url or "signin" in current_url or "auth" in current_url:
            if not wait_for_login(page):
                browser.close()
                return
        else:
            print(f"Already logged in (URL: {current_url})")
        time.sleep(2)

        if command == "explore":
            explore(page)
        elif command == "update":
            part_filter = None
            if "--part" in sys.argv:
                idx = sys.argv.index("--part")
                part_filter = sys.argv[idx + 1]
            update(page, part_filter)
        else:
            print(f"Unknown command: {command}")
            print(__doc__)

        browser.close()


if __name__ == "__main__":
    main()

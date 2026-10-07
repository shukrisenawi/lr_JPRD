#!/usr/bin/env python3
"""
Auto-Deploy Script for paskawasansik.com

Usage:
    python deploy.py

What it does:
    1. Detects changed files in Git (uncommitted or since last deploy)
    2. Rebuilds assets with npm run build
    3. Uploads changed PHP/Blade/JSX files to server
    4. Uploads public/build/ assets
    5. Clears Laravel caches on server
"""

import os
import subprocess
import sys
import ftplib
import fnmatch
import posixpath

# Configuration
LOCAL_DIR = r"D:\xampp\htdocs\lr_JPRD"
REMOTE_DIR = "/httpdocs"
SERVER_HOST = "paskawasansik.com"
SERVER_PORT = 21
SERVER_USER = "paskawas"
SERVER_PASS = "eG59Q%wA34?a"

# Files/folders that should NEVER be uploaded
IGNORE_PATTERNS = [
    ".env",
    ".env.*",
    "vendor/*",
    "storage/*",
    "node_modules/*",
    ".git/*",
    ".gitignore",
    ".gitattributes",
    "*.log",
    "public/build/*",  # Will be handled separately
    ".sisyphus/*",
    ".vscode/*",
    "*.md",
    "composer.lock",
    "package-lock.json",
]


def get_git_changed_files():
    """Get list of modified files from Git"""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=LOCAL_DIR,
            capture_output=True,
            text=True,
            check=True,
        )
        return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
    except subprocess.CalledProcessError:
        print("Warning: Git diff failed, uploading all tracked files")
        return []


def get_untracked_files():
    """Get untracked files"""
    try:
        result = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard"],
            cwd=LOCAL_DIR,
            capture_output=True,
            text=True,
            check=True,
        )
        return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
    except subprocess.CalledProcessError:
        return []


def should_upload(filepath):
    """Check if file should be uploaded based on ignore patterns"""
    for pattern in IGNORE_PATTERNS:
        if fnmatch.fnmatch(filepath, pattern):
            return False
    return True


def run_npm_build():
    """Run npm run build locally"""
    print("\n📦 Building assets with npm run build...")
    result = subprocess.run(
        ["npm.cmd" if os.name == "nt" else "npm", "run", "build"],
        cwd=LOCAL_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("❌ npm build failed:")
        print(result.stderr)
        return False
    print("✅ Build successful")
    return True


def connect_ftp():
    """Connect to the live server over explicit FTPS."""
    print(f"\n🔌 Connecting to {SERVER_HOST}:{SERVER_PORT}...")
    client = ftplib.FTP_TLS()
    client.connect(SERVER_HOST, port=SERVER_PORT, timeout=30)
    client.login(user=SERVER_USER, passwd=SERVER_PASS)
    # The host rejects private data channels; credentials still use explicit TLS.
    client.prot_c()
    client.cwd(REMOTE_DIR)
    print("✅ Connected")
    return client


def ensure_remote_directory(client, remote_directory):
    """Create missing folders below the configured application root."""
    current_directory = client.pwd()
    client.cwd(REMOTE_DIR)

    for directory in remote_directory.replace("\\", "/").split("/"):
        if not directory:
            continue
        try:
            client.cwd(directory)
        except ftplib.error_perm:
            client.mkd(directory)
            client.cwd(directory)

    client.cwd(current_directory)


def upload_file(client, local_path, remote_path):
    """Upload one file under the configured application root."""
    remote_path = remote_path.replace("\\", "/")
    remote_directory = posixpath.dirname(remote_path)
    if remote_directory:
        ensure_remote_directory(client, remote_directory)

    with open(local_path, "rb") as file_handle:
        client.storbinary(f"STOR {remote_path}", file_handle)


def upload_build_files(client):
    """Upload assets first and publish the manifest last."""
    print("\n📤 Uploading public/build/ assets...")
    build_dir = os.path.join(LOCAL_DIR, "public", "build")
    build_files = []
    for root, dirs, files in os.walk(build_dir):
        for file in files:
            local_file = os.path.join(root, file)
            rel_path = os.path.relpath(local_file, LOCAL_DIR).replace("\\", "/")
            build_files.append((rel_path, local_file))

    manifest_path = "public/build/manifest.json"
    asset_files = [(path, local) for path, local in build_files if path != manifest_path]
    manifest_file = next((local for path, local in build_files if path == manifest_path), None)

    for remote_path, local_file in asset_files:
        upload_file(client, local_file, remote_path)

    if manifest_file:
        upload_file(client, manifest_file, manifest_path)

    print(f"✅ Uploaded {len(build_files)} build files")


def clear_server_caches(client):
    """Remove Laravel's file-based route, config, and view caches via FTP."""
    print("\n🧹 Clearing server caches...")

    try:
        cached_files = client.nlst("bootstrap/cache")
    except ftplib.error_perm:
        cached_files = []

    for cached_file in cached_files:
        name = posixpath.basename(cached_file)
        if name == "config.php" or (name.startswith("routes") and name.endswith(".php")):
            try:
                client.delete(posixpath.join("bootstrap/cache", name))
                print(f"  ✅ Removed bootstrap/cache/{name}")
            except ftplib.error_perm as error:
                print(f"  ⚠️  Could not remove bootstrap/cache/{name}: {error}")

    try:
        compiled_views = client.nlst("storage/framework/views")
    except ftplib.error_perm:
        compiled_views = []

    cleared_views = 0
    for compiled_view in compiled_views:
        name = posixpath.basename(compiled_view)
        if name.endswith(".php"):
            try:
                client.delete(posixpath.join("storage/framework/views", name))
                cleared_views += 1
            except ftplib.error_perm:
                pass

    print(f"  ✅ Removed {cleared_views} compiled view(s)")


def main():
    print("=" * 60)
    print("🚀 Auto-Deploy: paskawasansik.com")
    print("=" * 60)

    # Step 1: Get changed files
    print("\n📋 Checking for changed files...")
    changed = get_git_changed_files()
    untracked = get_untracked_files()
    all_changed = list(set(changed + untracked))

    if not all_changed:
        print("No changes detected in Git")
        response = input("Deploy anyway? (y/n): ")
        if response.lower() != "y":
            print("Cancelled")
            return
    else:
        print(f"Found {len(all_changed)} changed file(s):")
        for f in all_changed[:10]:
            print(f"  - {f}")
        if len(all_changed) > 10:
            print(f"  ... and {len(all_changed) - 10} more")

    # Step 2: Build assets
    if not run_npm_build():
        print("❌ Deployment aborted due to build failure")
        return

    # Step 3: Connect to server
    try:
        client = connect_ftp()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return

    # Step 4: Upload changed files
    print("\n📤 Uploading changed files...")
    uploaded = 0
    skipped = 0

    for filepath in all_changed:
        if not should_upload(filepath):
            skipped += 1
            continue

        local_file = os.path.join(LOCAL_DIR, filepath)
        if not os.path.exists(local_file):
            print(f"  ⚠️  File not found: {filepath}")
            continue

        if os.path.isfile(local_file):
            remote_path = filepath.replace("\\", "/")
            try:
                upload_file(client, local_file, remote_path)
                print(f"  ✅ {filepath}")
                uploaded += 1
            except Exception as e:
                print(f"  ❌ {filepath}: {e}")

    print(f"\n📊 Uploaded: {uploaded}, Skipped: {skipped}")

    # Step 5: Upload build files
    upload_build_files(client)

    # Step 6: Clear caches
    clear_server_caches(client)

    # Cleanup
    client.quit()

    print("\n" + "=" * 60)
    print("✅ Deployment complete!")
    print(f"🌐 https://{SERVER_HOST}")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Deployment cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        sys.exit(1)

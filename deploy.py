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
import paramiko
import fnmatch

# Configuration
LOCAL_DIR = r"D:\xampp\htdocs\lr_JPRD"
REMOTE_DIR = "/home3/paskawas/public_html/sistem"
SERVER_HOST = "103.191.76.66"
SERVER_PORT = 222
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
        ["npm", "run", "build"],
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


def connect_ssh():
    """Connect to server via SSH"""
    print(f"\n🔌 Connecting to {SERVER_HOST}:{SERVER_PORT}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        SERVER_HOST,
        port=SERVER_PORT,
        username=SERVER_USER,
        password=SERVER_PASS,
        timeout=30,
    )
    print("✅ Connected")
    return client


def upload_file(sftp, local_path, remote_path):
    """Upload a single file"""
    remote_full = os.path.join(REMOTE_DIR, remote_path).replace("\\", "/")
    remote_dir = os.path.dirname(remote_full)

    # Create remote directory if needed
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        stdin, stdout, stderr = sftp.get_channel().get_transport().open_session()
        stdin.write(f"mkdir -p {remote_dir}\n".encode())
        stdin.close()

    sftp.put(local_path, remote_full)


def upload_build_files(sftp):
    """Upload public/build directory"""
    print("\n📤 Uploading public/build/ assets...")
    build_dir = os.path.join(LOCAL_DIR, "public", "build")
    remote_build = os.path.join(REMOTE_DIR, "public", "build").replace("\\", "/")

    # Clear old build on server
    stdin, stdout, stderr = sftp.get_channel().get_transport().open_session()
    stdin.write(f"rm -rf {remote_build}/*\n".encode())
    stdin.close()

    uploaded = 0
    for root, dirs, files in os.walk(build_dir):
        for file in files:
            local_file = os.path.join(root, file)
            rel_path = os.path.relpath(local_file, build_dir)
            remote_file = os.path.join(remote_build, rel_path).replace("\\", "/")
            remote_dir = os.path.dirname(remote_file)

            try:
                sftp.mkdir(remote_dir)
            except:
                pass

            sftp.put(local_file, remote_file)
            uploaded += 1

    print(f"✅ Uploaded {uploaded} build files")


def clear_server_caches(client):
    """Clear Laravel caches on server"""
    print("\n🧹 Clearing server caches...")
    commands = [
        "cd {} && php artisan route:clear 2>&1".format(REMOTE_DIR),
        "cd {} && php artisan view:clear 2>&1".format(REMOTE_DIR),
        "cd {} && php artisan config:clear 2>&1".format(REMOTE_DIR),
    ]

    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        output = stdout.read().decode().strip()
        if "ERROR" in output.upper() or "FAIL" in output.upper():
            print(f"  ⚠️  {output}")
        else:
            print(f"  ✅ {cmd.split('&&')[1].strip()}")


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
        client = connect_ssh()
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return

    sftp = client.open_sftp()

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
                upload_file(sftp, local_file, remote_path)
                print(f"  ✅ {filepath}")
                uploaded += 1
            except Exception as e:
                print(f"  ❌ {filepath}: {e}")

    print(f"\n📊 Uploaded: {uploaded}, Skipped: {skipped}")

    # Step 5: Upload build files
    upload_build_files(sftp)

    # Step 6: Clear caches
    clear_server_caches(client)

    # Cleanup
    sftp.close()
    client.close()

    print("\n" + "=" * 60)
    print("✅ Deployment complete!")
    print(f"🌐 https://{SERVER_HOST}/sistem")
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

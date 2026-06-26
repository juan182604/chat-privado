#!/bin/bash
set -e

echo "=== Installing Bun ==="
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
ln -sf $BUN_INSTALL/bin/bun /usr/local/bin/bun 2>/dev/null || true

echo "=== Installing dependencies ==="
bun install

echo "=== Building Next.js ==="
# Use next build with output standalone
NODE_ENV=production npx next build || true

echo "=== Creating uploads directories ==="
mkdir -p public/uploads/photo
mkdir -p public/uploads/voice

echo "=== Build complete ==="

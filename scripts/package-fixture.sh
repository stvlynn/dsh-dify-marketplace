#!/usr/bin/env bash
# Package the hello fixture with the official Dify plugin CLI when available,
# otherwise zip it into a .difypkg (the on-disk format is a ZIP archive).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/fixtures/dify-plugins/hello"
out="$root/fixtures/dify-plugins/hello.difypkg"
rm -f "$out"
if command -v dify >/dev/null 2>&1; then
  (cd "$src" && dify plugin package . -o "$out")
else
  (cd "$src" && zip -qr "$out" .)
fi
echo "wrote $out"
